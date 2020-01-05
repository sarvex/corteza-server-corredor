/* eslint-disable no-unused-expressions,@typescript-eslint/no-empty-function,@typescript-eslint/ban-ts-ignore */

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { Make, Trigger } from './trigger'

describe('trigger making', () => {
  // sample trigger
  const st = new Trigger()

  describe('from array', () => {
    it('should return empty array on empty empty array', () => {
      expect(Make([])).is.deep.eq([])
    })

    it('should filter out non-trigger values', () => {
      expect(Make([true, false, 42, '42', st, {}])).is.deep.eq([st])
    })
  })

  describe('from non-array', () => {
    it('should cast into array', () => {
      expect(Make(st)).is.deep.eq([st])
    })
  })

  describe('from function', () => {
    it('should collect all triggers', () => {
      expect(Make(function () {
        return [st, st]
      })).is.deep.eq([st, st])
    })
  })

  describe('from function*', () => {
    it('should collect all triggers', () => {
      expect(Make(function * () {
        yield st
        yield st
      })).is.deep.eq([st, st])
    })
  })
})