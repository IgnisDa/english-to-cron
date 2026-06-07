export class EnglishToCronError extends Error {
  public readonly type:
    | "InvalidInput"
    | "Capture"
    | "ParseToNumber"
    | "IncorrectValue";
  public state?: string;
  public token?: string;
  public value?: string;
  public errorDetail?: string;

  private constructor(
    type: "InvalidInput" | "Capture" | "ParseToNumber" | "IncorrectValue",
    message: string,
    extras?: { state?: string; token?: string; value?: string; errorDetail?: string }
  ) {
    super(message);
    this.name = "EnglishToCronError";
    this.type = type;
    Object.assign(this, extras);
  }

  static invalidInput(): EnglishToCronError {
    return new EnglishToCronError("InvalidInput", "Please enter human readable");
  }

  static capture(state: string, token: string): EnglishToCronError {
    return new EnglishToCronError("Capture", `Could not capture: ${token} in state: ${state}`, { state, token });
  }

  static parseToNumber(state: string, value: string): EnglishToCronError {
    return new EnglishToCronError("ParseToNumber", `Could not parse: ${value} to number. state: ${state}`, { state, value });
  }

  static incorrectValue(state: string, errorDetail: string): EnglishToCronError {
    return new EnglishToCronError("IncorrectValue", `value is invalid in state: ${state}. description: ${errorDetail}`, { state, errorDetail });
  }
}