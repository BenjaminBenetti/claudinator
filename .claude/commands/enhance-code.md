# You will refactor the code to make it better.

The user wants you to refactor $ARGUMENTS to make the code better. You will
refactor following these guidelines:

# 1 Class/Interface/Type Per File

Ensure that each class/interface/type is in its own file. If a file contains
multiple classes, move each class to its own file, keeping in mind DDD file and
folder structure.

# 2 Remove Unused Code

Remove any unused code. This includes unused imports, unused variables, unused
functions, unused classes, unused interfaces, unused types, etc.

# 3 Document the code & Organize code

**ALL methods MUST have JSDoc documentation comments** that include:

- A clear description of what the method does
- `@param` tags for all parameters with descriptions
- `@returns` tag describing the return value (if not void)
- `@throws` tag for any exceptions that might be thrown (if applicable)

Organize the code in each class / interface following this order, with block
comments between each section:

1. **Properties** (grouped by visibility)
   - Public properties
   - Protected properties
   - Private properties

2. **Constructor**

3. **Public Methods** (grouped logically by functionality)

4. **Protected Methods** (grouped logically by functionality)

5. **Private Methods** (grouped logically by functionality)
