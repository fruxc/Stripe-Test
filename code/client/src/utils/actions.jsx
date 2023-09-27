// Attaches _SUCCESS suffix to specified action type
export const S = (actionType) => `${actionType}_SUCCESS`;

// Attaches _FAILED suffix to specified action type
export const F = (actionType) => `${actionType}_FAIL`;

// Attaches _RESET suffix to specified action type
export const R = (actionType) => `${actionType}_RESET`;
