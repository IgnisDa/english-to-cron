# english-to-cron

Convert natural language English descriptions into cron expressions.

A TypeScript port of the [Rust `english-to-cron` crate](https://docs.rs/english-to-cron/latest/english_to_cron/).

## Install

```bash
npm install english-to-cron
```

## Usage

```ts
import { strCronSyntax } from "english-to-cron";

// Seconds
strCronSyntax("every 5 seconds");      // "0/5 * * * * ? *"
strCronSyntax("every second");         // "* * * * * ? *"

// Minutes
strCronSyntax("every minute");          // "0 * * * * ? *"
strCronSyntax("every 15 minutes");      // "0 0/15 * * * ? *"

// Hours
strCronSyntax("every 3 hours");         // "0 0 0/3 * * ? *"

// Days
strCronSyntax("every day");             // "0 0 0 */1 * ? *"
strCronSyntax("every day at 4:00 pm");  // "0 0 16 */1 * ? *"

// Specific times
strCronSyntax("at 10:00 am");            // "0 0 10 * * ? *"
strCronSyntax("Run at noon");            // "0 0 12 * * ? *"
strCronSyntax("Run at midnight");        // "0 0 0 * * ? *"

// Day ranges
strCronSyntax("Monday through Friday");  // "0 * * ? * MON-FRI *"

// With time ranges
strCronSyntax("every 10 minutes Monday through Friday between 9:00 am and 5:00 pm");
// "0 0/10 9-17 ? * MON-FRI *"

// Ordinal days
strCronSyntax("Run at midnight on the 1st and 15th of the month");
// "0 0 0 1,15 * ? *"

// Multiple times
strCronSyntax("2pm and 6pm");            // "0 0 14,18 * * ? *"

// Months
strCronSyntax("every 5 day at 4:30 pm only in September");
// "0 30 16 */5 SEP ? *"

// Years
strCronSyntax("every 2 day from January to August in 2020 and 2024");
// "0 0 0 */2 JAN-AUG ? 2020,2024"
```

## Error Handling

`strCronSyntax` throws an `EnglishToCronError` on invalid input:

```ts
import { strCronSyntax, EnglishToCronError } from "english-to-cron";

try {
  strCronSyntax("invalid input");
} catch (e) {
  if (e instanceof EnglishToCronError) {
    console.log(e.type);     // "InvalidInput"
    console.log(e.message);  // "Please enter human readable"
  }
}
```

## API

### `strCronSyntax(input: string): string`

Converts an English description of a schedule into a 7-field cron expression (seconds, minutes, hours, day-of-month, month, day-of-week, year).

Throws `EnglishToCronError` if the input cannot be parsed.

### `EnglishToCronError`

Custom error class with a `type` property:

| Type              | Description                                        |
| ----------------- | -------------------------------------------------- |
| `InvalidInput`    | Input is not a recognizable schedule description  |
| `Capture`         | A token could not be captured in a given state     |
| `ParseToNumber`   | A value could not be parsed as a number           |
| `IncorrectValue`  | An invalid value was encountered                   |

## License

MIT
