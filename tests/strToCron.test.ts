import { describe, it, expect } from "bun:test";
import { strCronSyntax, EnglishToCronError } from "../src/index";

describe("strCronSyntax", () => {
  it("throws on invalid input", () => {
    expect(() => strCronSyntax("")).toThrow();
    expect(() => strCronSyntax("invalid input")).toThrow();
  });

  // Seconds
  it("parses 'Run second'", () => {
    expect(strCronSyntax("Run second")).toBe("* * * * * ? *");
  });

  it("parses 'every 5 second'", () => {
    expect(strCronSyntax("every 5 second")).toBe("0/5 * * * * ? *");
  });

  it("parses 'every 5 second on september'", () => {
    expect(strCronSyntax("every 5 second on september")).toBe("0/5 * * * SEP ? *");
  });

  it("parses 'every 5 second on 9 month'", () => {
    expect(strCronSyntax("every 5 second on 9 month")).toBe("0/5 * * * 9 ? *");
  });

  it("parses 'Every 2 seconds, only on thursday'", () => {
    expect(strCronSyntax("Every 2 seconds, only on thursday")).toBe("0/2 * * ? * THU *");
  });

  it("parses 'Run every 2 second on the 12th day'", () => {
    expect(strCronSyntax("Run every 2 second on the 12th day")).toBe("0/2 0 0 12 * ? *");
  });

  it("parses 'Run every 2 second on Monday thursday'", () => {
    expect(strCronSyntax("Run every 2 second on Monday thursday")).toBe("0/2 * * ? * MON,THU *");
  });

  it("parses 'Run every 10 seconds Monday through thursday between 6:00 am and 8:00 pm'", () => {
    expect(strCronSyntax("Run every 10 seconds Monday through thursday between 6:00 am and 8:00 pm")).toBe("0/10 * 6-20 ? * MON-THU *");
  });

  // Minutes
  it("parses 'Run every minute'", () => {
    expect(strCronSyntax("Run every minute")).toBe("0 * * * * ? *");
  });

  it("parses 'Run every 15 minutes'", () => {
    expect(strCronSyntax("Run every 15 minutes")).toBe("0 0/15 * * * ? *");
  });

  it("parses 'every minutes on thursday'", () => {
    expect(strCronSyntax("every minutes on thursday")).toBe("0 * * ? * THU *");
  });

  it("parses 'every 2 minutes on Thursday'", () => {
    expect(strCronSyntax("every 2 minutes on Thursday")).toBe("0 0/2 * ? * THU *");
  });

  it("parses 'Run every 10 minutes Monday through Friday every month'", () => {
    expect(strCronSyntax("Run every 10 minutes Monday through Friday every month")).toBe("0 0/10 * ? * MON-FRI *");
  });

  it("parses 'Run every 1 minutes Monday through Thursday between 6:00 am and 9:00 pm'", () => {
    expect(strCronSyntax("Run every 1 minutes Monday through Thursday between 6:00 am and 9:00 pm")).toBe("0 0/1 6-21 ? * MON-THU *");
  });

  it("parses 'Run every 5 minutes Monday through Thursday between 6:00 am and 9:00 am'", () => {
    expect(strCronSyntax("Run every 5 minutes Monday through Thursday between 6:00 am and 9:00 am")).toBe("0 0/5 6-9 ? * MON-THU *");
  });

  it("parses 'Every 5 minutes, only on Friday'", () => {
    expect(strCronSyntax("Every 5 minutes, only on Friday")).toBe("0 0/5 * ? * FRI *");
  });

  // Hours
  it("parses 'Run every 3 hours'", () => {
    expect(strCronSyntax("Run every 3 hours")).toBe("0 0 0/3 * * ? *");
  });

  it("parses 'Run every 6 hours, starting at 1:00 pm on day Monday'", () => {
    expect(strCronSyntax("Run every 6 hours, starting at 1:00 pm on day Monday")).toBe("0 0 0/6 ? * MON *");
  });

  it("parses 'Run every 1 hour only on weekends'", () => {
    expect(strCronSyntax("Run every 1 hour only on weekends")).toBe("0 0 0/1 ? * SAT,SUN *");
  });

  it("parses 'Run every hour only on weekends'", () => {
    expect(strCronSyntax("Run every hour only on weekends")).toBe("0 0 * ? * SAT,SUN *");
  });

  it("parses '2pm on Tuesday, Wednesday and Thursday'", () => {
    expect(strCronSyntax("2pm on Tuesday, Wednesday and Thursday")).toBe("0 0 14 ? * TUE,WED,THU *");
  });

  // Days
  it("parses 'Run every day'", () => {
    expect(strCronSyntax("Run every day")).toBe("0 0 0 */1 * ? *");
  });

  it("parses 'Run every 4 days'", () => {
    expect(strCronSyntax("Run every 4 days")).toBe("0 0 0 */4 * ? *");
  });

  it("parses 'every day at 4:00 pm'", () => {
    expect(strCronSyntax("every day at 4:00 pm")).toBe("0 0 16 */1 * ? *");
  });

  it("parses 'every 2 day at 4:00 pm'", () => {
    expect(strCronSyntax("every 2 day at 4:00 pm")).toBe("0 0 16 */2 * ? *");
  });

  it("parses 'every 5 day at 4:30 pm'", () => {
    expect(strCronSyntax("every 5 day at 4:30 pm")).toBe("0 30 16 */5 * ? *");
  });

  it("parses 'every 5 day at 4:30 pm only in September'", () => {
    expect(strCronSyntax("every 5 day at 4:30 pm only in September")).toBe("0 30 16 */5 SEP ? *");
  });

  it("parses 'every 5 day at 4:30 pm Monday through Thursday'", () => {
    expect(strCronSyntax("every 5 day at 4:30 pm Monday through Thursday")).toBe("0 30 16 ? * MON-THU *");
  });

  it("parses 'Run every day from January to March'", () => {
    expect(strCronSyntax("Run every day from January to March")).toBe("0 0 0 */1 JAN-MAR ? *");
  });

  it("parses 'Run every 3 days at noon'", () => {
    expect(strCronSyntax("Run every 3 days at noon")).toBe("0 0 12 */3 * ? *");
  });

  it("parses 'Run every 2nd day of the month'", () => {
    expect(strCronSyntax("Run every 2nd day of the month")).toBe("0 0 0 2 * ? *");
  });

  // Month
  it("parses 'Run every sec from January to March'", () => {
    expect(strCronSyntax("Run every sec from January to March")).toBe("* * * * JAN-MAR ? *");
  });

  it("parses 'Run every minute from January to March'", () => {
    expect(strCronSyntax("Run every minute from January to March")).toBe("0 * * * JAN-MAR ? *");
  });

  it("parses 'Run every hours from January to March'", () => {
    expect(strCronSyntax("Run every hours from January to March")).toBe("0 0 * * JAN-MAR ? *");
  });

  // Year
  it("parses 'every 2 day from January to August in 2020 and 2024'", () => {
    expect(strCronSyntax("every 2 day from January to August in 2020 and 2024")).toBe("0 0 0 */2 JAN-AUG ? 2020,2024");
  });

  // Specific Times (AM/PM)
  it("parses 'Run at 10:00 am'", () => {
    expect(strCronSyntax("Run at 10:00 am")).toBe("0 0 10 * * ? *");
  });

  it("parses 'Run at 12:15 pm'", () => {
    expect(strCronSyntax("Run at 12:15 pm")).toBe("0 15 12 * * ? *");
  });

  it("parses 'Run at 6:00 pm every Monday through Friday'", () => {
    expect(strCronSyntax("Run at 6:00 pm every Monday through Friday")).toBe("0 0 18 ? * MON-FRI *");
  });

  it("parses 'Run at noon every Sunday'", () => {
    expect(strCronSyntax("Run at noon every Sunday")).toBe("0 0 12 ? * SUN *");
  });

  it("parses 'Run at midnight on the 1st and 15th of the month'", () => {
    expect(strCronSyntax("Run at midnight on the 1st and 15th of the month")).toBe("0 0 0 1,15 * ? *");
  });

  it("parses 'midnight on Tuesdays'", () => {
    expect(strCronSyntax("midnight on Tuesdays")).toBe("0 0 0 ? * TUE *");
  });

  it("parses 'Run at 5:15am every Tuesday'", () => {
    expect(strCronSyntax("Run at 5:15am every Tuesday")).toBe("0 15 5 ? * TUE *");
  });

  it("parses '7pm every Thursday'", () => {
    expect(strCronSyntax("7pm every Thursday")).toBe("0 0 19 ? * THU *");
  });

  it("parses '2pm and 6pm'", () => {
    expect(strCronSyntax("2pm and 6pm")).toBe("0 0 14,18 * * ? *");
  });

  it("parses '5am, 10am and 3pm'", () => {
    expect(strCronSyntax("5am, 10am and 3pm")).toBe("0 0 5,10,15 * * ? *");
  });

  it("parses 'Run every hour only on Monday'", () => {
    expect(strCronSyntax("Run every hour only on Monday")).toBe("0 0 * ? * MON *");
  });

  it("parses 'Run every 30 seconds only on weekends'", () => {
    expect(strCronSyntax("Run every 30 seconds only on weekends")).toBe("0/30 * * ? * SAT,SUN *");
  });

  it("parses '4pm, 5pm and 7pm'", () => {
    expect(strCronSyntax("4pm, 5pm and 7pm")).toBe("0 0 16,17,19 * * ? *");
  });

  it("parses '4pm, 5pm, and 7pm'", () => {
    expect(strCronSyntax("4pm, 5pm, and 7pm")).toBe("0 0 16,17,19 * * ? *");
  });

  it("parses '4pm, 5pm, 7pm'", () => {
    expect(strCronSyntax("4pm, 5pm, 7pm")).toBe("0 0 16,17,19 * * ? *");
  });

  it("parses '4pm and 5pm and 7pm'", () => {
    expect(strCronSyntax("4pm and 5pm and 7pm")).toBe("0 0 16,17,19 * * ? *");
  });

  // Error cases
  it("throws EnglishToCronError for invalid input", () => {
    expect(() => strCronSyntax("invalid input")).toThrow(EnglishToCronError);
  });

  it("throws EnglishToCronError for empty input", () => {
    expect(() => strCronSyntax("")).toThrow(EnglishToCronError);
  });
});