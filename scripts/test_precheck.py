"""Unit tests for the secret checks in scripts/precheck.py.

Run from the repository root:

  python -m unittest discover -s scripts -p "test_precheck.py"

Every secret value is built at runtime from pieces so this file never matches
the patterns precheck scans for.
"""

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


if __name__ == "__main__":
    unittest.main()
