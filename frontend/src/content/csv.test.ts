import { describe, expect, it } from "vitest";
import { CsvError, parseCsv, parseCsvFile } from "./csv";

describe("parseCsv", () => {
  it("parses a simple table keyed by header", () => {
    expect(parseCsv("id,name\na,Alpha\nb,Beta\n")).toEqual([
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('id,text\na,"hello, world"\n')[0].text).toBe(
      "hello, world",
    );
  });

  it("turns doubled quotes into a single quote", () => {
    expect(parseCsv('id,text\na,"say ""hi"""\n')[0].text).toBe('say "hi"');
  });

  it("handles CRLF line endings", () => {
    const records = parseCsv("id,name\r\na,Alpha\r\nb,Beta\r\n");
    expect(records).toHaveLength(2);
    expect(records[1].name).toBe("Beta");
  });

  it("keeps empty cells", () => {
    expect(parseCsv("id,name,note\na,,x\n")).toEqual([
      { id: "a", name: "", note: "x" },
    ]);
  });

  it("skips comment and blank lines", () => {
    expect(parseCsv("# placeholder\nid,name\n\na,Alpha\n")).toEqual([
      { id: "a", name: "Alpha" },
    ]);
  });

  it("strips a leading UTF-8 BOM and trims header names", () => {
    const records = parseCsv("\uFEFFid , name\na,Alpha\n");
    expect(records).toEqual([{ id: "a", name: "Alpha" }]);
  });

  it("throws a CsvError naming the line with the wrong number of columns", () => {
    try {
      parseCsv("id,name,unit\na,Alpha\n");
      throw new Error("did not throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CsvError);
      const csvError = error as CsvError;
      expect(csvError.line).toBe(2);
      expect(csvError.message).toContain("Line 2");
    }
  });
});

describe("parseCsvFile", () => {
  const required = ["indicator_id", "side", "notify"];

  it("fills an optional column a row leaves out, and keeps the rows that have it", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "conditions.csv",
      "condition_id,name,based_on,symptoms,source\n" +
        "a,A,x:above,Assumption\n" +
        "b,B,y:below,thirst fatigue,Assumption\n",
      problems,
      ["condition_id", "name", "based_on", "source"],
      "symptoms",
    );
    expect(problems).toEqual([]);
    expect(records).toEqual([
      {
        condition_id: "a",
        name: "A",
        based_on: "x:above",
        symptoms: "",
        source: "Assumption",
      },
      {
        condition_id: "b",
        name: "B",
        based_on: "y:below",
        symptoms: "thirst fatigue",
        source: "Assumption",
      },
    ]);
  });

  it("still reports a row short by two cells with an optional column", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "conditions.csv",
      "condition_id,name,based_on,symptoms,source\na,A,Assumption\n",
      problems,
      ["condition_id", "name", "based_on", "source"],
      "symptoms",
    );
    expect(records).toEqual([]);
    expect(problems).toHaveLength(1);
  });

  it("reads the rows when every required column is in the header", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "file.csv",
      "indicator_id,side,threshold,notify\na,above,1,crew\n",
      problems,
      required,
    );
    expect(records).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  it("reports each missing column by name and reads no rows", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "file.csv",
      "indicator_id,side,threshold,attention_level\na,above,1,watch\n" +
        "b,below,2,watch\n",
      problems,
      ["indicator_id", "side", "threshold", "attention_level", "notify"],
    );
    expect(records).toEqual([]);
    expect(problems).toEqual(["Missing column 'notify' in file.csv."]);
  });

  it("turns a malformed row into one problem", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "file.csv",
      "indicator_id,side,threshold,notify\na,above\n",
      problems,
      required,
    );
    expect(records).toEqual([]);
    expect(
      problems.some((problem) => problem.includes("Malformed row in file.csv")),
    ).toBe(true);
  });

  it("reports the required columns of a file with no header at all", () => {
    const problems: string[] = [];
    const records = parseCsvFile(
      "file.csv",
      "# only a comment\n",
      problems,
      required,
    );
    expect(records).toEqual([]);
    expect(problems).toEqual([
      "Missing column 'indicator_id' in file.csv.",
      "Missing column 'side' in file.csv.",
      "Missing column 'notify' in file.csv.",
    ]);
  });
});
