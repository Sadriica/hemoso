"""Loading the synthetic demo data: valid rows in, invalid ones skipped once."""

from __future__ import annotations

import pytest

from app import seed, storage


def write_indicators(tmp_path, unit="example_unit") -> None:
    data = tmp_path / "data"
    data.mkdir(exist_ok=True)
    (data / "indicators.csv").write_text(
        "id,name,unit,direction,measured_on_board,hazards,source\n"
        f"example_indicator,Example indicator,{unit},higher,"
        "example method,isolation_and_confinement,Assumption\n",
        encoding="utf-8",
    )


def write_demo(tmp_path, rows, bom=False):
    header = "person_id,indicator_id,value,unit,mission_day,time\n"
    content = header + "\n".join(rows) + "\n"
    path = tmp_path / "demo_data.csv"
    path.write_text(content, encoding="utf-8-sig" if bom else "utf-8")
    return path


def write_demo_context(tmp_path, rows, bom=False):
    header = "person_id,indicator_id,value,unit,mission_day,time,context\n"
    content = header + "\n".join(rows) + "\n"
    path = tmp_path / "demo_data.csv"
    path.write_text(content, encoding="utf-8-sig" if bom else "utf-8")
    return path


def test_loads_valid_rows(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        [
            "demo_astronaut_1,example_indicator,1,example_unit,1,13:30",
            "demo_astronaut_1,example_indicator,2,example_unit,2,08:00",
        ],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 2
    assert skipped == 0
    assert reasons == []
    assert len(store.history("demo_astronaut_1", "example_indicator")) == 2


def test_loads_seven_column_header_with_context(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo_context(
        tmp_path,
        [
            "demo_astronaut_1,example_indicator,1,example_unit,1,13:30,after_exercise",
            "demo_astronaut_1,example_indicator,2,example_unit,2,08:00,rest",
        ],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 2
    assert skipped == 0
    assert reasons == []
    history = store.history("demo_astronaut_1", "example_indicator")
    assert [row.context for row in history] == ["after_exercise", "rest"]


def test_loads_legacy_six_column_header_defaults_context(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        ["demo_astronaut_1,example_indicator,1,example_unit,1,13:30"],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 1
    assert skipped == 0
    assert reasons == []
    history = store.history("demo_astronaut_1", "example_indicator")
    assert [row.context for row in history] == ["rest"]


def test_loads_218_rows(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    rows = [
        f"demo_astronaut_1,example_indicator,{i % 10},example_unit,"
        f"{i // 24 + 1},{i % 24:02d}:00,rest"
        for i in range(218)
    ]
    path = write_demo_context(tmp_path, rows)
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 218
    assert skipped == 0
    assert reasons == []
    assert len(store.history("demo_astronaut_1", "example_indicator")) == 218


def test_bad_time_skipped(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        [
            "demo_astronaut_1,example_indicator,1,example_unit,1,13:30",
            "demo_astronaut_1,example_indicator,2,example_unit,1,25:00",
        ],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 1
    assert skipped == 1
    assert any(reason.startswith("line 3") for reason in reasons)


def test_unit_mismatch_skipped(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path, unit="example_unit")
    path = write_demo(
        tmp_path,
        ["demo_astronaut_1,example_indicator,1,other_unit,1,13:30"],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 0
    assert skipped == 1
    assert reasons == ["line 2: unit mismatch"]


def test_bom(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        ["demo_astronaut_1,example_indicator,1,example_unit,1,13:30"],
        bom=True,
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 1
    assert skipped == 0
    assert reasons == []


def test_second_run_adds_nothing(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        ["demo_astronaut_1,example_indicator,1,example_unit,1,13:30"],
    )
    store = storage.MemoryStorage()

    first = seed.load_demo_data(store, path)
    second = seed.load_demo_data(store, path)

    assert first == (1, 0, [])
    assert second[0] == 0
    assert second[1] == 1
    assert "duplicate" in second[2][0]
    assert len(store.history("demo_astronaut_1", "example_indicator")) == 1


def test_command_missing_file_exits_zero(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))

    rc = seed.main(["--path", str(tmp_path / "demo_data.csv")])

    out = capsys.readouterr().out
    assert rc == 0
    assert "not found" in out


def test_command_seeds_fixture(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    monkeypatch.setattr(storage, "_storage", None)
    monkeypatch.setattr(storage, "_storage_kind", None)
    monkeypatch.setenv("STORAGE", "memory")
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        ["demo_astronaut_1,example_indicator,1,example_unit,1,13:30"],
    )

    rc = seed.main(["--path", str(path)])

    out = capsys.readouterr().out
    assert rc == 0
    assert "added 1" in out
    assert "skipped 0" in out


def test_wrong_header_raises(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = tmp_path / "demo_data.csv"
    path.write_text(
        "person_id,indicator_id,value,unit,mission_day\n"
        "demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n",
        encoding="utf-8",
    )
    store = storage.MemoryStorage()

    with pytest.raises(ValueError):
        seed.load_demo_data(store, path)


def test_command_wrong_header_exits_one(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    monkeypatch.setenv("STORAGE", "memory")
    path = tmp_path / "demo_data.csv"
    path.write_text(
        "person_id,indicator_id,value,unit,mission_day\n",
        encoding="utf-8",
    )

    rc = seed.main(["--path", str(path)])

    out = capsys.readouterr().out
    assert rc == 1
    assert "person_id,indicator_id,value,unit,mission_day,time" in out


def test_wrong_number_of_columns_skipped(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = write_demo(
        tmp_path,
        [
            "demo_astronaut_1,example_indicator,1,example_unit,1,13:30",
            "demo_astronaut_1,example_indicator,1,example_unit,1,13:30,EXTRA",
            "demo_astronaut_1,example_indicator,1,example_unit,1",
        ],
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 1
    assert skipped == 2
    assert all("wrong number of columns" in reason for reason in reasons)


def test_blank_line_skipped(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = tmp_path / "demo_data.csv"
    path.write_text(
        "person_id,indicator_id,value,unit,mission_day,time\n"
        "demo_astronaut_1,example_indicator,1,example_unit,1,13:30\n"
        "\n"
        "demo_astronaut_1,example_indicator,1,example_unit,1,25:00\n",
        encoding="utf-8",
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 1
    assert skipped == 1
    assert reasons == ["line 4: invalid time"]


def test_strips_cells_and_skips_blank_row(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path, unit=" example_unit")
    path = tmp_path / "demo_data.csv"
    path.write_text(
        "person_id,indicator_id,value,unit,mission_day,time\n"
        "demo_astronaut_1,example_indicator,1, example_unit,1,13:30 \n"
        "\n"
        "demo_astronaut_1,example_indicator,2, example_unit,2,08:00\n",
        encoding="utf-8",
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 2
    assert skipped == 0
    assert reasons == []
    assert len(store.history("demo_astronaut_1", "example_indicator")) == 2


def test_line_num_after_multiline_quoted_row(tmp_path, monkeypatch):
    monkeypatch.setenv("CONFIG_DIR", str(tmp_path))
    write_indicators(tmp_path)
    path = tmp_path / "demo_data.csv"
    path.write_text(
        "person_id,indicator_id,value,unit,mission_day,time\n"
        'demo_astronaut_1,example_indicator,"abc\n",example_unit,1,13:30\n'
        "demo_astronaut_1,example_indicator,1,example_unit,1,25:00\n",
        encoding="utf-8",
    )
    store = storage.MemoryStorage()

    added, skipped, reasons = seed.load_demo_data(store, path)

    assert added == 0
    assert skipped == 2
    assert reasons == ["line 3: invalid value", "line 4: invalid time"]
