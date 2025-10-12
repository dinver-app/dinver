# JSON Menu Import Documentation

## Overview

The JSON Menu Import system allows you to import menu data (categories, items, and sizes) from JSON files into the Dinver restaurant management system. This system supports both food and drink menus with optional size variations.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [JSON Structure](#json-structure)
3. [Basic Menu Structure (No Sizes)](#basic-menu-structure-no-sizes)
4. [Advanced Menu Structure (With Sizes)](#advanced-menu-structure-with-sizes)
5. [Size Management](#size-management)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [Examples](#examples)
9. [Best Practices](#best-practices)

## API Endpoints

### 1. File-based Import (Direct from File System)

```
POST /api/sysadmin/json-menu-import/:restaurantSlug/import
```

**Parameters:**

- `restaurantSlug` (string): The restaurant's slug identifier
- `menuType` (string, optional): "food" or "drinks" (default: "food")

**Body:**

```json
{
  "menuType": "food"
}
```

### 2. Database-based Import (From Stored JSON Files)

```
POST /api/sysadmin/json-files/:id/import
```

**Parameters:**

- `id` (UUID): The ID of the stored JSON file in the database

## JSON Structure

### Root Level Structure

```json
{
  "categories": [
    // Array of category objects
  ],
  "items": [
    // Array of menu item objects
  ]
}
```

### Category Structure

```json
{
  "name": {
    "hr": "Croatian name",
    "en": "English name"
  },
  "description": {
    "hr": "Croatian description (optional)",
    "en": "English description (optional)"
  }
}
```

### Menu Item Structure

#### Basic Item (No Sizes)

```json
{
  "name": {
    "hr": "Croatian name",
    "en": "English name"
  },
  "description": {
    "hr": "Croatian description",
    "en": "English description"
  },
  "price": 12.5,
  "categoryName": "Category Name"
}
```

#### Advanced Item (With Sizes)

```json
{
  "name": {
    "hr": "Croatian name",
    "en": "English name"
  },
  "description": {
    "hr": "Croatian description",
    "en": "English description"
  },
  "sizes": [
    {
      "name": "Normal",
      "price": 9.2,
      "isDefault": true
    },
    {
      "name": "Jumbo",
      "price": 18.4,
      "isDefault": false
    }
  ],
  "categoryName": "Category Name"
}
```

## Basic Menu Structure (No Sizes)

### Complete Example

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pizza",
        "en": "Pizza"
      },
      "description": {
        "hr": "Različite vrste pizza",
        "en": "Various types of pizza"
      }
    },
    {
      "name": {
        "hr": "Pasta",
        "en": "Pasta"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Pizza Margherita",
        "en": "Pizza Margherita"
      },
      "description": {
        "hr": "Pelat, sir, origano, maslina",
        "en": "Tomato sauce, cheese, oregano, olives"
      },
      "price": 12.5,
      "categoryName": "Pizza"
    },
    {
      "name": {
        "hr": "Spaghetti Carbonara",
        "en": "Spaghetti Carbonara"
      },
      "description": {
        "hr": "Špageti, jaja, panceta, parmezan",
        "en": "Spaghetti, eggs, pancetta, parmesan"
      },
      "price": 15.0,
      "categoryName": "Pasta"
    }
  ]
}
```

## Advanced Menu Structure (With Sizes)

### Complete Example with Sizes

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pizza",
        "en": "Pizza"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Pizza Margherita",
        "en": "Pizza Margherita"
      },
      "sizes": [
        {
          "name": "Normal",
          "price": 9.2,
          "isDefault": true
        },
        {
          "name": "Jumbo",
          "price": 18.4,
          "isDefault": false
        }
      ],
      "description": {
        "hr": "Pelat, sir, origano, maslina",
        "en": "Tomato sauce, cheese, oregano, olives"
      },
      "categoryName": "Pizza"
    },
    {
      "name": {
        "hr": "Pizza Vesuvio",
        "en": "Pizza Vesuvio"
      },
      "sizes": [
        {
          "name": "Normal",
          "price": 9.2,
          "isDefault": true
        },
        {
          "name": "Jumbo",
          "price": 18.4,
          "isDefault": false
        }
      ],
      "description": {
        "hr": "Pelat, sir, šunka, origano, maslina",
        "en": "Tomato sauce, cheese, ham, oregano, olives"
      },
      "categoryName": "Pizza"
    }
  ]
}
```

## Size Management

### How Sizes Work

1. **Global Creation**: Sizes are created globally for the restaurant, not per item
2. **Reuse**: The same size (e.g., "Normal", "Jumbo") can be used across multiple items
3. **Automatic Translation**: Size names are automatically translated to Croatian and English
4. **Case Insensitive**: Size matching is case-insensitive ("normal" = "Normal")

### Size Object Structure

```json
{
  "name": "Size Name", // Required: The size name
  "price": 12.5, // Required: Price for this size
  "isDefault": true // Optional: Whether this is the default size
}
```

### Size Validation Rules

- **name**: Required string, cannot be empty
- **price**: Required number, must be >= 0
- **isDefault**: Optional boolean, defaults to false
- **Default Size**: At least one size per item must have `isDefault: true` (automatically assigned to first size if none specified)

## Validation Rules

### General Rules

1. **Required Fields**:
   - Categories: `name.hr`, `name.en`
   - Items: `name.hr`, `name.en`, `categoryName`
   - Items with sizes: `sizes` array with valid size objects
   - Items without sizes: `price` field

2. **Language Support**:
   - Croatian (`hr`) and English (`en`) are supported
   - At least one language must be provided for names
   - Descriptions are optional

3. **Category Matching**:
   - `categoryName` in items must match a category's `name.hr`
   - Categories are created first, then items are linked to them

### Size-Specific Rules

1. **Size Names**: Must be unique within the restaurant
2. **Price Validation**: Must be a valid number >= 0
3. **Default Size**: Exactly one size per item must be marked as default
4. **Size Reuse**: Same size names across different items will reference the same size entity

## Error Handling

### Common Error Types

1. **Validation Errors**:

   ```json
   {
     "error": "Invalid size data for item: Pizza Margherita - size: {\"name\":\"\",\"price\":-5}"
   }
   ```

2. **Category Not Found**:

   ```json
   {
     "error": "Category not found for item: Pizza Margherita"
   }
   ```

3. **Size Not Found**:
   ```json
   {
     "error": "Size Normal not found for item: Pizza Margherita"
   }
   ```

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "results": {
    "categories": { "created": 1, "existing": 0 },
    "items": { "created": 5, "errors": 1 },
    "sizes": { "created": 2, "existing": 0 },
    "errors": ["List of specific errors"]
  }
}
```

## Examples

### Example 1: Pizza Menu with Sizes

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pizza",
        "en": "Pizza"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Pizza Margherita",
        "en": "Pizza Margherita"
      },
      "sizes": [
        {
          "name": "Normal",
          "price": 9.2,
          "isDefault": true
        },
        {
          "name": "Jumbo",
          "price": 18.4
        }
      ],
      "description": {
        "hr": "Pelat, sir, origano, maslina",
        "en": "Tomato sauce, cheese, oregano, olives"
      },
      "categoryName": "Pizza"
    },
    {
      "name": {
        "hr": "Pizza Vesuvio",
        "en": "Pizza Vesuvio"
      },
      "sizes": [
        {
          "name": "Normal",
          "price": 9.2,
          "isDefault": true
        },
        {
          "name": "Jumbo",
          "price": 18.4
        }
      ],
      "description": {
        "hr": "Pelat, sir, šunka, origano, maslina",
        "en": "Tomato sauce, cheese, ham, oregano, olives"
      },
      "categoryName": "Pizza"
    }
  ]
}
```

### Example 2: Simple Menu Without Sizes

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pasta",
        "en": "Pasta"
      }
    },
    {
      "name": {
        "hr": "Salate",
        "en": "Salads"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Spaghetti Carbonara",
        "en": "Spaghetti Carbonara"
      },
      "description": {
        "hr": "Špageti, jaja, panceta, parmezan",
        "en": "Spaghetti, eggs, pancetta, parmesan"
      },
      "price": 15.0,
      "categoryName": "Pasta"
    },
    {
      "name": {
        "hr": "Cezar salata",
        "en": "Caesar salad"
      },
      "price": 8.5,
      "categoryName": "Salate"
    }
  ]
}
```

### Example 3: Items Without Descriptions

```json
{
  "categories": [
    {
      "name": {
        "hr": "Desert",
        "en": "Dessert"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Tiramisu",
        "en": "Tiramisu"
      },
      "price": 6.0,
      "categoryName": "Desert"
    },
    {
      "name": {
        "hr": "Čokoladni kolač",
        "en": "Chocolate cake"
      },
      "price": 5.5,
      "categoryName": "Desert"
    }
  ]
}
```

### Example 4: Drinks Menu (Size in Name)

**Important for drinks:** Since drinks don't use the sizes system, include the size/volume directly in the item name.

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pića",
        "en": "Drinks"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Jana 0,33l",
        "en": "Jana 0.33l"
      },
      "description": {
        "hr": "Prirodna mineralna voda",
        "en": "Natural mineral water"
      },
      "price": 2.5,
      "categoryName": "Pića"
    },
    {
      "name": {
        "hr": "Jana 0,5l",
        "en": "Jana 0.5l"
      },
      "description": {
        "hr": "Prirodna mineralna voda",
        "en": "Natural mineral water"
      },
      "price": 3.0,
      "categoryName": "Pića"
    },
    {
      "name": {
        "hr": "Coca Cola 0,25l",
        "en": "Coca Cola 0.25l"
      },
      "price": 2.0,
      "categoryName": "Pića"
    },
    {
      "name": {
        "hr": "Coca Cola 0,5l",
        "en": "Coca Cola 0.5l"
      },
      "price": 3.5,
      "categoryName": "Pića"
    }
  ]
}
```

### Example 5: Mixed Menu (Food with Sizes + Drinks)

```json
{
  "categories": [
    {
      "name": {
        "hr": "Pizza",
        "en": "Pizza"
      }
    },
    {
      "name": {
        "hr": "Pića",
        "en": "Drinks"
      }
    }
  ],
  "items": [
    {
      "name": {
        "hr": "Pizza Margherita",
        "en": "Pizza Margherita"
      },
      "sizes": [
        {
          "name": "Normal",
          "price": 9.2,
          "isDefault": true
        },
        {
          "name": "Jumbo",
          "price": 18.4
        }
      ],
      "description": {
        "hr": "Pelat, sir, origano, maslina",
        "en": "Tomato sauce, cheese, oregano, olives"
      },
      "categoryName": "Pizza"
    },
    {
      "name": {
        "hr": "Jana 0,5l",
        "en": "Jana 0.5l"
      },
      "price": 3.0,
      "categoryName": "Pića"
    }
  ]
}
```

## Best Practices

### 1. File Organization

- Use descriptive filenames: `pizza-menu.json`, `drinks-menu.json`
- Keep file sizes reasonable (avoid extremely large JSON files)
- Use consistent naming conventions

### 2. Size Management

- Use consistent size names across items: "Small", "Medium", "Large" or "Normal", "Jumbo"
- Always specify `isDefault: true` for one size per item
- Use meaningful size names that customers will understand

### 3. Drinks vs Food Items

- **Food items**: Use the `sizes` array for different portions (Normal, Jumbo, etc.)
- **Drink items**: Include size/volume directly in the name (e.g., "Jana 0,5l", "Coca Cola 0,33l")
- **Mixed menus**: You can have both food items with sizes and drink items with sizes in names

### 4. Translation Quality

- Provide accurate translations for both Croatian and English
- Keep descriptions concise but informative
- Use consistent terminology across the menu

### 5. Data Validation

- Test your JSON structure before importing
- Validate that all `categoryName` references match existing categories
- Ensure all required fields are present

### 6. Performance Considerations

- The system processes sizes efficiently by creating them once per restaurant
- Large menus with many items and sizes are supported
- Consider breaking very large menus into multiple files

## Troubleshooting

### Common Issues

1. **Sizes Not Appearing**:
   - Check that `sizes` array is properly formatted
   - Ensure size names are consistent across items
   - Verify that at least one size has `isDefault: true`

2. **Category Not Found Errors**:
   - Ensure `categoryName` in items exactly matches `name.hr` in categories
   - Check for typos or extra spaces

3. **Price Validation Errors**:
   - Ensure all prices are valid numbers >= 0
   - Check for missing price fields in items without sizes

4. **Translation Issues**:
   - Ensure both `hr` and `en` names are provided
   - Check for empty or null translation values

### Debug Information

The system provides detailed console logging during import:

```
Found 2 unique sizes: ["Normal", "Jumbo"]
Size map created: {"Normal": "uuid-123", "Jumbo": "uuid-456"}
Item Pizza Margherita has sizes: true [...]
Linking 2 sizes for item Pizza Margherita
Successfully linked size Normal (ID: uuid-123) to item Pizza Margherita
```

This documentation should help you successfully import menu data using the JSON import system. For additional support or questions, please refer to the API documentation or contact the development team.
