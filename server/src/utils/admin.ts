/**
 * Parses object's composite keys by:
 * - Flattening composite keys (e.g., "metadata.email") into nested structures
 * - Stringifying values of top-level keys that contain composite children
 *
 * @param {Record<string, any>} objWithCompositeKeys - Object with dot-notation composite keys
 *
 * @returns {Record<string, any>} Transformed object with nested structures and stringified values
 *
 * @example
 * // Input: { "metadata.email": "test@example.com", "config": {} }
 * // Output: { "metadata": { "email": "test@example.com" }, "config": "{}" }
 */
function parseObjectCompositeKeys(objWithCompositeKeys: Record<string, any>) {
  const upperLvlKeysToStringifyValues = new Set<string>();

  Object.keys(objWithCompositeKeys).forEach((key) => {
    if (key.includes(".")) {
      // Parsing composite key;
      const originalValue = objWithCompositeKeys[key];
      const flatKeysHierarchy = key.split(".");
      upperLvlKeysToStringifyValues.add(flatKeysHierarchy[0]);

      let currentObjStructure = objWithCompositeKeys;

      for (let i = 0; i < flatKeysHierarchy.length - 1; i++) {
        const nonCompositeKeyFromHierarchy = flatKeysHierarchy[i];
        if (!Object.hasOwn(currentObjStructure, nonCompositeKeyFromHierarchy)) {
          currentObjStructure[nonCompositeKeyFromHierarchy] = {};
        }

        currentObjStructure = currentObjStructure[nonCompositeKeyFromHierarchy];
      }

      const leafKey = flatKeysHierarchy[flatKeysHierarchy.length - 1];
      currentObjStructure[leafKey] = originalValue;

      // Delete the original composite key (for example, "metadata.email");
      delete objWithCompositeKeys[key];
    } else if (
      objWithCompositeKeys[key] &&
      typeof objWithCompositeKeys[key] === "object" &&
      objWithCompositeKeys[key] !== null &&
      !Object.getOwnPropertyNames(objWithCompositeKeys[key]).length &&
      Object.prototype.toString.call(objWithCompositeKeys[key]) === "[object Object]"
    ) {
      // Parsing key with value = empty obj - {};
      objWithCompositeKeys[key] = JSON.stringify(objWithCompositeKeys[key]);
    }
  });

  for (const key of Array.from(upperLvlKeysToStringifyValues)) {
    objWithCompositeKeys[key] = JSON.stringify(objWithCompositeKeys[key]);
  }

  return objWithCompositeKeys;
}

/**
 * Transforms composite keys in list response records.
 * Applies {@link parseObjectCompositeKeys} to each record's `params` field.
 *
 * @param {Record<string, any>} response - List response
 *
 * @returns {Record<string, any>} Response with parsed record params
 */
function instanceMetadataListAfterParser(response: Record<string, any>) {
  if (Array.isArray(response.records) && response.records.length) {
    response.records.map((record) => (record.params = parseObjectCompositeKeys(record.params)));
  }

  return response;
}

/**
 * Transforms composite keys in single record response.
 * Applies {@link parseObjectCompositeKeys} to record's `params` field.
 *
 * @param {Record<string, any>} response - Single response
 *
 * @returns {Record<string, any>} Response with parsed record params
 */
function instanceMetadataShowAfterParser(response: Record<string, any>) {
  if (response.record?.params) {
    response.record.params = parseObjectCompositeKeys(response.record.params);
  }

  return response;
}

export { parseObjectCompositeKeys, instanceMetadataListAfterParser, instanceMetadataShowAfterParser };
