"""Unit tests for the secret checks in scripts/precheck.py.

Run from the repository root:

  python -m unittest discover -s scripts -p "test_precheck.py"

Every secret value is built at runtime from pieces so this file never matches
the patterns precheck scans for.
"""

import contextlib
import io
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import precheck

ENV_RULE = "env file (only .env.example may be committed)"


def ghp_token() -> str:
    return "gh" + "p_" + "A" * 36


def gho_token() -> str:
    return "gh" + "o_" + "A" * 28


def github_pat_token() -> str:
    return "github" + "_pat_" + "A" * 60


def private_key_header() -> str:
    return "-----BEGIN " + "RSA " + "PRIVATE KEY-----"


def jwt() -> str:
    return "ey" + "J" + "a" * 100  # 103 characters, starts with eyJ


def supabase_key() -> str:
    return "SUPABASE" + "_KEY="


def service_role_key() -> str:
    return "SUPABASE_SERVICE_ROLE" + "_KEY="


def sb_secret_token() -> str:
    return "sb" + "_secret_" + "A" * 10


def forbidden_word() -> str:
    return "A" + "I"


def claude_path() -> str:
    return ".cl" + "aude/settings.json"


def claude_mention() -> str:
    return "use cl" + "aude to draft"


class SecretRuleTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)

    def _write(self, name: str, content) -> str:
        path = self.dir / name
        if isinstance(content, bytes):
            path.write_bytes(content)
        else:
            path.write_text(content, encoding="utf-8")
        return str(path)

    def test_env_file_is_blocked(self):
        path = self._write(".env", "PORT=3000\n")
        self.assertEqual(precheck.secret_rule(path), ENV_RULE)

    def test_env_suffix_file_is_blocked(self):
        path = self._write(".env.local", "PORT=3000\n")
        self.assertEqual(precheck.secret_rule(path), ENV_RULE)

    def test_env_example_with_empty_values_passes(self):
        content = supabase_key() + "\n" + service_role_key() + "\n"
        path = self._write(".env.example", content)
        self.assertIsNone(precheck.secret_rule(path))

    def test_private_key_header_is_blocked(self):
        path = self._write("id_rsa", private_key_header() + "\nnot-a-key\n")
        self.assertEqual(precheck.secret_rule(path), "private key header")

    def test_github_tokens_are_blocked(self):
        for token in (ghp_token(), gho_token(), github_pat_token()):
            with self.subTest(token=token[:8]):
                path = self._write("token.txt", token + "\n")
                self.assertEqual(precheck.secret_rule(path), "GitHub token")

    def test_jwt_shaped_secret_is_blocked(self):
        path = self._write("jwt.txt", "export const key = '" + jwt() + "'\n")
        self.assertEqual(precheck.secret_rule(path), "JWT-shaped secret (Supabase key)")

    def test_short_eyj_string_is_not_a_jwt(self):
        # 100 characters total (eyJ plus 97 more) must pass: the rule needs > 100.
        path = self._write("short.txt", "ey" + "J" + "a" * 97 + "\n")
        self.assertIsNone(precheck.secret_rule(path))

    def test_supabase_key_assignment_is_blocked(self):
        path = self._write("settings.py", supabase_key() + '"some-key-value"\n')
        self.assertEqual(precheck.secret_rule(path), "Supabase key set to a non-empty value")

    def test_service_role_key_assignment_is_blocked(self):
        path = self._write("settings.py", service_role_key() + "'some-key-value'\n")
        self.assertEqual(precheck.secret_rule(path), "Supabase key set to a non-empty value")

    def test_empty_supabase_key_assignment_passes(self):
        path = self._write("settings.py", supabase_key() + "\n" + service_role_key() + "\n")
        self.assertIsNone(precheck.secret_rule(path))

    def test_sb_secret_key_is_blocked(self):
        path = self._write("settings.py", "const key = '" + sb_secret_token() + "'\n")
        self.assertEqual(precheck.secret_rule(path), "Supabase secret key (sb_secret_)")

    def test_export_supabase_key_assignment_is_blocked(self):
        path = self._write("env.sh", "export " + supabase_key() + '"some-key-value"\n')
        self.assertEqual(precheck.secret_rule(path), "Supabase key set to a non-empty value")

    def test_quoted_supabase_key_assignment_is_blocked(self):
        path = self._write("settings.py", supabase_key() + " 'some-key-value'\n")
        self.assertEqual(precheck.secret_rule(path), "Supabase key set to a non-empty value")

    def test_export_empty_supabase_key_passes(self):
        path = self._write("env.sh", "export " + supabase_key() + "\n")
        self.assertIsNone(precheck.secret_rule(path))

    def test_binary_file_is_skipped(self):
        content = (private_key_header() + "\n").encode() + b"\x00" + b"tail"
        path = self._write("app.bin", content)
        self.assertIsNone(precheck.secret_rule(path))

    def test_file_over_one_megabyte_is_skipped(self):
        token = ("gh" + "p_").encode() + b"a" * 40
        content = token + b"z" * (precheck.MAX_SECRET_FILE_BYTES + 1 - len(token))
        path = self._write("big.txt", content)
        self.assertIsNone(precheck.secret_rule(path))

    def test_missing_file_is_skipped(self):
        self.assertIsNone(precheck.secret_rule(str(self.dir / "does-not-exist")))

    def test_clean_file_passes(self):
        path = self._write("README.md", "# HeMoSo\nPlain text, no secrets.\n")
        self.assertIsNone(precheck.secret_rule(path))


class ForbiddenTests(unittest.TestCase):
    def test_claude_path_is_not_blocked(self):
        self.assertIsNone(precheck.FORBIDDEN.search("chore(config): add " + claude_path() + " (#3)"))

    def test_claude_mention_is_blocked(self):
        self.assertIsNotNone(precheck.FORBIDDEN.search(claude_mention() + " (#3)"))

    def test_claude_md_file_is_not_blocked(self):
        self.assertIsNone(precheck.FORBIDDEN.search("chore(docs): add CLAUDE.md (#3)"))


class OwnershipTests(unittest.TestCase):
    def test_eng1_owns_claude_settings(self):
        self.assertTrue(precheck.owns("eng1", ".claude/settings.json"))

    def test_eng1_owns_findings_template(self):
        self.assertTrue(precheck.owns("eng1", "docs/findings/TEMPLATE.md"))


class MainTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.addCleanup(os.chdir, os.getcwd())
        self.repo = Path(self._tmp.name) / "repo"
        self.repo.mkdir()
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "t")

    def git(self, *args: str) -> None:
        p = subprocess.run(["git", "-C", str(self.repo)] + list(args), capture_output=True, text=True)
        if p.returncode != 0:
            self.fail(f"git {' '.join(args)}: {p.stderr.strip()}")

    def write(self, rel: str, content: str) -> None:
        path = self.repo / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def run_main(self, cwd: Path | None = None) -> tuple[int, str]:
        os.chdir(str(cwd or self.repo))
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = precheck.main()
        return code, buf.getvalue()

    def seed_root_commit(self) -> None:
        self.write("README.md", "root\n")
        self.git("add", ".")
        self.git("commit", "-qm", "init")

    def test_merge_of_main_commits_does_not_block_own_push(self):
        self.seed_root_commit()
        self.git("branch", "origin/main")
        self.git("checkout", "-qb", "bio1")
        self.write("config/content/o.md", "own\n")
        self.git("add", ".")
        self.git("commit", "-qm", "feat(config): own file (#8)")
        self.git("checkout", "-q", "main")
        self.write("scripts/now.py", "foreign\n")
        self.git("add", ".")
        self.git("commit", "-qm", "chore(eng1): " + forbidden_word() + " log")
        self.git("branch", "-f", "origin/main", "main")
        self.git("checkout", "-q", "bio1")
        self.git("merge", "--no-edit", "-q", "main")
        code, out = self.run_main()
        self.assertEqual(code, 0, out)
        self.assertIn("OK to push", out)

    def test_merge_of_other_person_branch_does_not_block_own_push(self):
        self.seed_root_commit()
        self.git("branch", "origin/main")
        self.git("checkout", "-qb", "eng1")
        self.write("scripts/now.py", "eng1 work\n")
        self.git("add", ".")
        self.git("commit", "-qm", "feat(checks): eng1 work (#6)")
        self.git("branch", "origin/eng1")
        self.git("checkout", "-q", "main")
        self.git("checkout", "-qb", "phys")
        self.write("config/data/o.csv", "own\n")
        self.git("add", ".")
        self.git("commit", "-qm", "data(indicators): own file (#14)")
        self.git("merge", "--no-edit", "-q", "origin/eng1")
        code, out = self.run_main()
        self.assertEqual(code, 0, out)
        self.assertIn("OK to push", out)
        self.assertIn("Files changed or not pushed: 1", out)

    def test_foreign_file_in_own_commit_fails(self):
        self.seed_root_commit()
        self.git("branch", "origin/main")
        self.git("checkout", "-qb", "bio1")
        self.write("scripts/now.py", "foreign\n")
        self.git("add", ".")
        self.git("commit", "-qm", "feat(scripts): own file (#8)")
        code, out = self.run_main()
        self.assertEqual(code, 1, out)
        self.assertIn("files outside your paths", out)
        self.assertIn("scripts/now.py", out)

    def test_secret_in_own_commit_found_after_cleanup(self):
        self.seed_root_commit()
        self.git("branch", "origin/main")
        self.git("checkout", "-qb", "bio1")
        self.write("config/content/o.md", ghp_token() + "\n")
        self.git("add", ".")
        self.git("commit", "-qm", "feat(config): own file (#8)")
        self.write("config/content/o.md", "clean\n")
        code, out = self.run_main()
        self.assertEqual(code, 1, out)
        self.assertIn("secret in 'config/content/o.md': GitHub token", out)

    def test_running_from_subdirectory_finds_staged_secret(self):
        self.seed_root_commit()
        self.git("branch", "origin/main")
        self.git("checkout", "-qb", "bio1")
        self.write("config/content/o.md", ghp_token() + "\n")
        self.git("add", ".")
        (self.repo / "backend").mkdir()
        code, out = self.run_main(self.repo / "backend")
        self.assertEqual(code, 1, out)
        self.assertIn("secret in 'config/content/o.md': GitHub token", out)

    def test_merge_commit_card_note_is_case_insensitive(self):
        self.seed_root_commit()
        self.git("checkout", "-qb", "bio1")
        self.write("config/content/o.md", "own\n")
        self.git("add", ".")
        self.git("commit", "-qm", "feat(config): own file (#8)")
        self.git("checkout", "-q", "main")
        self.write("docs/x.md", "main\n")
        self.git("add", ".")
        self.git("commit", "-qm", "docs(x): main file (#9)")
        self.git("checkout", "-q", "bio1")
        self.git("merge", "--no-edit", "-q", "main")
        code, out = self.run_main()
        self.assertEqual(code, 0, out)
        self.assertNotIn("does not mention its card", out)
        self.assertIn("OK to push", out)


if __name__ == "__main__":
    unittest.main()
