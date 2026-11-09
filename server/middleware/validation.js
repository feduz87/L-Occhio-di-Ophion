/**
 * Input Validation Middleware
 */

/**
 * Validate character creation request body
 */
export function validateCharacterCreation(req, res, next) {
  const { name, heritage, race, class: charClass } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string') {
    errors.push('name is required and must be a string');
  } else if (name.trim().length === 0) {
    errors.push('name cannot be empty');
  } else if (name.length > 255) {
    errors.push('name must be 255 characters or less');
  }

  if (!heritage || typeof heritage !== 'string') {
    errors.push('heritage is required and must be a string');
  }

  if (!race || typeof race !== 'string') {
    errors.push('race is required and must be a string');
  }

  if (!charClass || typeof charClass !== 'string') {
    errors.push('class is required and must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
  }

  next();
}

/**
 * Validate UUID format
 */
export function validateUUID(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`${paramName} must be a valid UUID`],
      });
    }

    next();
  };
}

export default validateCharacterCreation;
