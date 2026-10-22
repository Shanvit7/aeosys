import assert from "node:assert/strict"
import { test } from "node:test"
import { isHorizontalCardSwipe } from "./card-stack"

test("card stack advances only for deliberate horizontal swipes", () => {
  assert.equal(isHorizontalCardSwipe({ x: 180, y: 100 }, { x: 120, y: 108 }), true)
  assert.equal(isHorizontalCardSwipe({ x: 120, y: 100 }, { x: 180, y: 108 }), true)
  assert.equal(isHorizontalCardSwipe({ x: 120, y: 100 }, { x: 160, y: 100 }), false)
  assert.equal(isHorizontalCardSwipe({ x: 120, y: 100 }, { x: 130, y: 170 }), false)
})
