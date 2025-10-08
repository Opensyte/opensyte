declare module "cron-parser" {
  interface ParserOptions {
    currentDate?: Date | string | number;
    tz?: string;
  }

  interface CronDate {
    toDate(): Date;
  }

  interface CronExpression {
    next(): CronDate;
  }

  export function parseExpression(
    expression: string,
    options?: ParserOptions
  ): CronExpression;
}
