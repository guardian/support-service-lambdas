# Validation Module

This module provides reusable validation functions that can be used across different lambda handlers in this project.

## Installation

This module is available as `@modules/validation/index` throughout the workspace.

## Available Functions

### `validateInput<TInput, TOutput>(event, schema, errorMessage?)`

A generic validation function that validates input against a Zod schema and throws an error if validation fails.

**Parameters:**
- `event: TInput` - The input event data to validate
- `schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>` - The Zod schema to validate against
- `errorMessage?: string` - Optional custom error message (defaults to generic validation error)

**Returns:** `TOutput` - The parsed and validated data

**Throws:** `Error` if validation fails

### `validateInputSafe<TInput, TOutput>(event, schema)`

A safe validation function that returns a result object instead of throwing an error. Useful when you need to handle validation errors without using try-catch blocks.

**Parameters:**
- `event: TInput` - The input event data to validate
- `schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>` - The Zod schema to validate against

**Returns:** `{ success: true; data: TOutput } | { success: false; error: string }`

## Usage Examples

### Using `validateInput` (recommended for most cases)

```typescript
import { validateInput } from '@modules/validation/index';
import { MyInputSchema } from '../types';

export const handler = async (event: MyInput) => {
  try {
    const parsedEvent = validateInput(
      event,
      MyInputSchema,
      'Failed to parse event data'
    );
    
    // Use parsedEvent here...
    
  } catch (error) {
    // Handle validation error
    return {
      ...event,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

### Using `validateInputSafe` (for non-throwing validation)

```typescript
import { validateInputSafe } from '@modules/validation/index';
import { MyInputSchema } from '../types';

export const handler = async (event: MyInput) => {
  const result = validateInputSafe(event, MyInputSchema);
  
  if (!result.success) {
    return {
      ...event,
      error: result.error
    };
  }
  
  const parsedEvent = result.data;
  // Use parsedEvent here...
};
```

## Migration from Existing Pattern

If you have existing validation code like this:

```typescript
// OLD PATTERN - repetitive and not reusable
const parsedEventResult = MyInputSchema.safeParse(event);
if (!parsedEventResult.success) {
  throw new Error('Error parsing event to type: MyInput');
}
const parsedEvent = parsedEventResult.data;
```

Replace it with:

```typescript
// NEW PATTERN - reusable and consistent
import { validateInput } from '@modules/validation/index';

const parsedEvent = validateInput(
  event,
  MyInputSchema,
  'Error parsing event to type: MyInput'
);
```

## Benefits

- **Consistency**: All lambdas use the same validation pattern
- **Reusability**: Single module used across all handlers
- **Type Safety**: Full TypeScript support with proper generic types
- **Error Handling**: Consistent error messages and handling
- **Flexibility**: Choose between throwing (`validateInput`) or safe (`validateInputSafe`) validation
- **Global Access**: Available throughout the workspace via `@modules/validation/index`
