import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sendPaginated } from "../src/lib/paginationResponse.js";

describe("sendPaginated", () => {
  it("envia data e pagination", () => {
    let body;
    const res = {
      json: (b) => {
        body = b;
      },
    };
    sendPaginated(res, {
      rows: [{ id: 1 }],
      total: 1,
      page: 1,
      limit: 20,
    });
    assert.equal(body.data.length, 1);
    assert.equal(body.pagination.total, 1);
    assert.equal(body.pagination.pages, 1);
  });
});
