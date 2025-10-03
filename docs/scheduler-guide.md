# Workflow Scheduler Guide

## Overview

The OpenSyte Workflow Scheduler enables automated execution of workflows based on cron expressions. This allows you to run workflows on a schedule (daily, weekly, monthly, or custom intervals).

## Features

- **Cron-based scheduling**: Use standard cron expressions to define when workflows should run
- **Timezone support**: Schedule workflows in any timezone
- **Automatic retry**: Failed executions are automatically retried with configurable retry logic
- **Execution history**: Track all scheduled workflow executions
- **Manual triggers**: Manually trigger scheduled workflows on demand
- **Queue management**: Prevents system overload with concurrent execution limits

## Cron Expression Format

Cron expressions consist of 5 fields:

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Weekday (0-6, Sunday=0)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of Month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Examples

- `0 9 * * *` - Daily at 9:00 AM
- `30 * * * *` - Every hour at :30
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9 1 * *` - First day of every month at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 9-17 * * *` - Every hour from 9 AM to 5 PM
- `0 9,12,15 * * *` - At 9 AM, 12 PM, and 3 PM

## API Usage

### Create a Schedule

```typescript
import { api } from "~/trpc/react";

const createSchedule = api.workflows.scheduler.createSchedule.useMutation();

await createSchedule.mutateAsync({
  workflowId: "workflow_123",
  cronExpression: "0 9 * * *", // Daily at 9 AM
  timezone: "America/New_York",
  enabled: true,
  payload: {
    // Optional data to pass to the workflow
    customField: "value",
  },
});
```

### Update a Schedule

```typescript
const updateSchedule = api.workflows.scheduler.updateSchedule.useMutation();

await updateSchedule.mutateAsync({
  scheduleId: "schedule_123",
  cronExpression: "0 10 * * *", // Change to 10 AM
  enabled: false, // Disable the schedule
});
```

### Delete a Schedule

```typescript
const deleteSchedule = api.workflows.scheduler.deleteSchedule.useMutation();

await deleteSchedule.mutateAsync({
  scheduleId: "schedule_123",
});
```

### Get All Schedules

```typescript
const { data } = api.workflows.scheduler.getSchedules.useQuery({
  workflowId: "workflow_123", // Optional: filter by workflow
});

console.log(data.schedules);
```

### Get Schedule History

```typescript
const { data } = api.workflows.scheduler.getScheduleHistory.useQuery({
  scheduleId: "schedule_123",
  limit: 50,
  offset: 0,
});

console.log(data.executions);
```

### Validate Cron Expression

```typescript
const { data } = api.workflows.scheduler.validateCronExpression.useQuery({
  cronExpression: "0 9 * * *",
});

console.log(data.isValid); // true
console.log(data.description); // "Daily at 9:00"
console.log(data.nextRun); // Next execution time
```

### Manually Trigger a Schedule

```typescript
const triggerSchedule = api.workflows.scheduler.triggerSchedule.useMutation();

await triggerSchedule.mutateAsync({
  scheduleId: "schedule_123",
});
```

## Running the Scheduler Background Job

The scheduler requires a background job to check for and execute scheduled workflows.

### Development

```bash
# Start the scheduler job
bun run scheduler
```

### Production

#### Option 1: Separate Process

Run the scheduler as a separate process:

```bash
# Start the scheduler
bun run scheduler

# Or with custom configuration
SCHEDULER_INTERVAL_MS=30000 \
SCHEDULER_MAX_CONCURRENT=10 \
SCHEDULER_RETRY_ATTEMPTS=5 \
bun run scheduler
```

#### Option 2: Docker/Kubernetes

Create a separate container/pod for the scheduler:

```dockerfile
# Dockerfile.scheduler
FROM oven/bun:latest

WORKDIR /app
COPY . .

RUN bun install
RUN bun run db:generate

CMD ["bun", "run", "scheduler"]
```

#### Option 3: System Cron

Add to your system crontab to run every minute:

```cron
* * * * * cd /path/to/opensyte && bun run scripts/run-scheduler.ts
```

## Environment Variables

Configure the scheduler using environment variables:

- `SCHEDULER_INTERVAL_MS`: How often to check for due schedules (default: 60000 = 1 minute)
- `SCHEDULER_MAX_CONCURRENT`: Maximum concurrent workflow executions (default: 5)
- `SCHEDULER_RETRY_ATTEMPTS`: Number of retry attempts on failure (default: 3)
- `SCHEDULER_RETRY_DELAY_MS`: Delay between retries (default: 5000 = 5 seconds)

## Monitoring

### Check Scheduler Status

The scheduler logs execution statistics every 5 minutes:

```
📊 Scheduler Stats: {
  totalExecutions: 150,
  successfulExecutions: 145,
  failedExecutions: 5,
  averageDuration: "1234.56ms",
  lastRunAt: "2024-01-15T10:30:00.000Z"
}
```

### View Execution History

Use the API to view execution history:

```typescript
const { data } = api.workflows.scheduler.getScheduleHistory.useQuery({
  limit: 100,
});
```

## Best Practices

1. **Use appropriate intervals**: Don't schedule workflows too frequently if they're resource-intensive
2. **Set timezone correctly**: Always specify the timezone for your schedules
3. **Monitor failures**: Regularly check execution history for failed workflows
4. **Test cron expressions**: Use the validation endpoint to verify your cron expressions
5. **Limit concurrent executions**: Adjust `SCHEDULER_MAX_CONCURRENT` based on your system resources
6. **Use payload for context**: Pass necessary data in the schedule payload to avoid hardcoding

## Troubleshooting

### Schedule Not Running

1. Check if the scheduler background job is running
2. Verify the schedule is enabled: `enabled: true`
3. Check the `nextRunAt` field to see when it's scheduled to run next
4. Review logs for any errors

### Execution Failures

1. Check the execution history for error messages
2. Verify the workflow is active and valid
3. Check if required integrations are configured
4. Review workflow logs for detailed error information

### Performance Issues

1. Reduce `SCHEDULER_MAX_CONCURRENT` if system is overloaded
2. Increase `SCHEDULER_INTERVAL_MS` to check less frequently
3. Optimize workflows to run faster
4. Consider scaling horizontally with multiple scheduler instances

## Example: Task Reminder Workflow

Here's a complete example of setting up a daily task reminder workflow:

```typescript
// 1. Create the workflow (assuming it already exists)
const workflowId = "task_reminder_workflow";

// 2. Create a schedule for daily execution at 9 AM
const { scheduleId } = await createSchedule.mutateAsync({
  workflowId,
  cronExpression: "0 9 * * *", // Daily at 9 AM
  timezone: "America/New_York",
  enabled: true,
  payload: {
    reminderType: "daily",
    notifyManagers: true,
  },
});

// 3. Monitor execution
const { data: history } = await getScheduleHistory.query({
  scheduleId,
  limit: 10,
});

console.log(`Last 10 executions:`, history.executions);
```

## Security Considerations

- Schedules are organization-scoped - users can only manage schedules for their organization
- Workflow execution permissions are enforced during scheduled runs
- Schedule payloads are stored in the database - avoid storing sensitive data
- Use environment variables for sensitive configuration

## Limitations

- Minimum interval: 1 minute (cron expressions with seconds are not supported)
- Maximum concurrent executions: Configurable, default is 5
- Timezone support: All standard IANA timezones are supported
- Cron expression complexity: Standard 5-field cron format only

## Future Enhancements

- Support for more complex cron expressions (6-field with seconds)
- Distributed scheduler for high availability
- Schedule dependencies (run workflow B after workflow A completes)
- Schedule templates for common patterns
- Advanced monitoring and alerting
