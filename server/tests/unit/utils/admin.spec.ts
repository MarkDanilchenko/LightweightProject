import {
  parseObjectCompositeKeys,
  instanceMetadataListAfterParser,
  instanceMetadataShowAfterParser,
} from "#server/utils/admin";

describe("Admin Utility", (): void => {
  describe("parseObjectCompositeKeys", (): void => {
    it("should flatten composite keys into nested structures", (): void => {
      const input = {
        "metadata.email": "test@example.com",
        "metadata.name": "John",
      };

      const result = parseObjectCompositeKeys(input);

      expect(result).toEqual({
        metadata: JSON.stringify({
          email: "test@example.com",
          name: "John",
        }),
      });
    });

    it("should stringify parent objects that contain composite keys", (): void => {
      const input = {
        "metadata.email": "test@example.com",
        standalone: "value",
      };

      const result = parseObjectCompositeKeys(input);

      expect(result).toEqual({
        metadata: JSON.stringify({
          email: "test@example.com",
        }),
        standalone: "value",
      });
    });

    it("should stringify empty object values", (): void => {
      const input = {
        config: {},
        "metadata.email": "test@example.com",
      };

      const result = parseObjectCompositeKeys(input);

      expect(result).toEqual({
        metadata: JSON.stringify({
          email: "test@example.com",
        }),
        config: "{}",
      });
    });

    it("should handle deep nesting with multiple composite keys at different levels", (): void => {
      const input = {
        "a.b.c": "value1",
        "a.d": "value2",
        "e.f": "value3",
      };

      const result = parseObjectCompositeKeys(input);

      expect(result).toEqual({
        a: JSON.stringify({
          b: { c: "value1" },
          d: "value2",
        }),
        e: JSON.stringify({ f: "value3" }),
      });
    });
  });

  describe("instanceMetadataListAfterParser", (): void => {
    it("should return response unchanged if records is missing", (): void => {
      const input = {};
      const result = instanceMetadataListAfterParser(input);

      expect(result).toEqual(input);
    });

    it("should return response unchanged if records is not an array", (): void => {
      const input = { records: "not an array" };
      const result = instanceMetadataListAfterParser(input);

      expect(result).toEqual(input);
    });

    it("should return response unchanged if records is empty array", (): void => {
      const input = { records: [] };
      const result = instanceMetadataListAfterParser(input);

      expect(result).toEqual(input);
    });

    it("should parse composite keys in each record.params", (): void => {
      const input = {
        records: [
          {
            id: 1,
            params: {
              "metadata.email": "test1@example.com",
            },
          },
          {
            id: 2,
            params: {
              "metadata.email": "test2@example.com",
              "metadata.name": "John",
            },
          },
        ],
      };

      const result = instanceMetadataListAfterParser(input);

      expect(result.records[0].params).toEqual({
        metadata: JSON.stringify({
          email: "test1@example.com",
        }),
      });

      expect(result.records[1].params).toEqual({
        metadata: JSON.stringify({
          email: "test2@example.com",
          name: "John",
        }),
      });
    });
  });

  describe("instanceMetadataShowAfterParser", (): void => {
    it("should return response unchanged if record.params is missing", (): void => {
      const input = { record: {} };
      const result = instanceMetadataShowAfterParser(input);

      expect(result).toEqual(input);
    });

    it("should parse composite keys in record.params", (): void => {
      const input = {
        record: {
          params: {
            "metadata.email": "test@example.com",
            "metadata.name": "John",
            "metadata.age": 30,
            sideInfo: "Lorem ipsum dolor sit amet",
          },
        },
      };

      const result = instanceMetadataShowAfterParser(input);

      expect(result.record.params).toEqual({
        metadata: JSON.stringify({
          email: "test@example.com",
          name: "John",
          age: 30,
        }),
        sideInfo: "Lorem ipsum dolor sit amet",
      });
    });
  });
});
