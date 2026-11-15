"""Tests for the symptom layer in scripts/check_content.py (T-78).

The cases are Bio 2's "Checker cases" 1 to 4 in
team/bio2/notes/symptom-test-vectors.md and FORMATS.md section 3.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_check_content as base  # noqa: E402

VALID = base.VALID

FIVE = "condition_id,name,based_on,symptoms,source\n"
SYMPTOMS = (
    "symptom_id,name,red_flag,shared,source\n"
    "confusion,Confusion,yes,yes,Assumption\n"
    "thirst,Thirst,no,no,https://example.org\n"
)
LOG = (
    "person_id,mission_day,time,symptom_id,severity\n"
    "demo_astronaut_1,12,14:10,confusion,3\n"
)



def files(conditions=None, symptoms=SYMPTOMS, log=LOG):
    out = dict(VALID)
    if conditions is not None:
        out["config/rules/conditions.csv"] = conditions
    if symptoms is not None:
        out["config/data/symptoms.csv"] = symptoms
    if log is not None:
        out["config/data/symptom_log.csv"] = log
    return out


class SymptomCheckTest(unittest.TestCase):
    problems = base.ContentCheckTest.problems
    errors = base.ContentCheckTest.errors
    assert_error = base.ContentCheckTest.assert_error

    # Case 1: the old four-column file, and a four-cell row under five columns.
    def test_four_column_header_still_valid(self):
        self.assertEqual(self.errors(files(symptoms=None, log=None)), [])

    def test_four_cell_row_under_five_columns(self):
        conditions = FIVE + "example_condition,Example condition,example_indicator:above,Assumption\n"
        self.assertEqual(self.errors(files(conditions)), [])

    # Case 2: five cells, known ids, no repeat.
    def test_five_cell_row_valid(self):
        conditions = FIVE + "example_condition,Example,example_indicator:above,confusion thirst,Assumption\n"
        self.assertEqual(self.errors(files(conditions)), [])

    def test_unknown_symptom(self):
        conditions = FIVE + "example_condition,Example,example_indicator:above,dizziness,Assumption\n"
        self.assert_error(files(conditions), "symptom 'dizziness' is not in config/data/symptoms.csv")

    def test_repeated_symptom(self):
        conditions = FIVE + "example_condition,Example,example_indicator:above,thirst thirst,Assumption\n"
        self.assert_error(files(conditions), "symptoms names 'thirst' twice")

    def test_symptom_without_symptoms_file(self):
        conditions = FIVE + "example_condition,Example,example_indicator:above,thirst,Assumption\n"
        self.assert_error(files(conditions, symptoms=None, log=None), "config/data/symptoms.csv is missing")

    def test_wrong_cell_count(self):
        conditions = FIVE + "example_condition,Example,example_indicator:above\n"
        self.assert_error(files(conditions), "expected 4 or 5 got 3")

    # Case 3: symptoms.csv.
    def test_red_flag_yes_no(self):
        self.assert_error(files(symptoms=SYMPTOMS + "fever_like,Fever,maybe,no,Assumption\n", log=None),
                          "red_flag must be yes or no")

    def test_shared_yes_no(self):
        self.assert_error(files(symptoms=SYMPTOMS + "fever_like,Fever,no,Yes,Assumption\n", log=None),
                          "shared must be yes or no")

    def test_symptom_id_snake_case(self):
        self.assert_error(files(symptoms=SYMPTOMS + "Blurred-vision,Blurred,no,no,Assumption\n", log=None),
                          "invalid symptom_id")

    def test_symptom_source(self):
        self.assert_error(files(symptoms=SYMPTOMS + "nausea,Nausea,no,no,a book\n", log=None),
                          "source must be an http(s) link or 'Assumption'")

    def test_duplicate_symptom(self):
        self.assert_error(files(symptoms=SYMPTOMS + "thirst,Thirst again,no,no,Assumption\n", log=None),
                          "duplicate symptom_id 'thirst'")

    def test_symptom_not_an_indicator(self):
        self.assert_error(files(symptoms=SYMPTOMS + "example_indicator,Ex,no,no,Assumption\n", log=None),
                          "is an indicator id")

    # Case 4: symptom_log.csv.
    def test_log_valid(self):
        self.assertEqual(self.errors(files()), [])

    def test_log_mission_day(self):
        for bad in ("0", "-1", "1.5", "x"):
            self.assert_error(files(log=LOG + f"demo_astronaut_1,{bad},08:00,thirst,1\n"),
                              "mission_day must be a positive integer")

    def test_log_time(self):
        self.assert_error(files(log=LOG + "demo_astronaut_1,3,24:00,thirst,1\n"), "time must be HH:MM")

    def test_log_severity(self):
        for bad in ("0", "4", "2.0"):
            self.assert_error(files(log=LOG + f"demo_astronaut_1,3,08:00,thirst,{bad}\n"),
                              "severity must be 1, 2 or 3")

    def test_log_unknown_symptom(self):
        self.assert_error(files(log=LOG + "demo_astronaut_1,3,08:00,dizziness,1\n"),
                          "symptom_id 'dizziness' is not in config/data/symptoms.csv")


if __name__ == "__main__":
    unittest.main()
