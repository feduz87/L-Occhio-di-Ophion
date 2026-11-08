/**
 * Character Service Tests
 */

import { describe, it, expect } from 'vitest';
import * as characterService from '../services/character.js';

describe('Character Service', () => {
  describe('validateName', () => {
    it('should accept valid names', () => {
      expect(() => characterService.validateName('Aragorn')).not.toThrow();
      expect(() => characterService.validateName('A')).not.toThrow();
    });

    it('should reject empty names', () => {
      expect(() => characterService.validateName('')).toThrow('Character name cannot be empty');
      expect(() => characterService.validateName('   ')).toThrow('Character name cannot be empty');
    });

    it('should reject names over 255 characters', () => {
      const longName = 'a'.repeat(256);
      expect(() => characterService.validateName(longName)).toThrow('Character name too long');
    });
  });

  describe('validateClass', () => {
    it('should accept valid classes', () => {
      const validClasses = ['Guerriero', 'Ramingo', 'Ladro', 'Sapiente', 'Guaritore'];
      validClasses.forEach(cls => {
        expect(() => characterService.validateClass(cls)).not.toThrow();
      });
    });

    it('should reject invalid classes', () => {
      expect(() => characterService.validateClass('Mago')).toThrow('Invalid class');
      expect(() => characterService.validateClass('Barbarian')).toThrow('Invalid class');
    });
  });

  describe('validateHeritage', () => {
    it('should accept valid heritage for Uomini', () => {
      expect(() => characterService.validateHeritage('Uomini', 'Sangue Antico')).not.toThrow();
      expect(() => characterService.validateHeritage('Uomini', 'Discendenza delle Dune')).not.toThrow();
      expect(() => characterService.validateHeritage('Uomini', 'Uomini del Nord')).not.toThrow();
    });

    it('should reject invalid heritage', () => {
      expect(() => characterService.validateHeritage('Uomini', 'Invalid Heritage')).toThrow();
      expect(() => characterService.validateHeritage('Elfi', 'Sangue Antico')).toThrow();
    });

    it('should reject invalid race', () => {
      expect(() => characterService.validateHeritage('InvalidRace', 'Sangue Antico')).toThrow('Invalid race');
    });
  });

  describe('generateAbilityScores', () => {
    it('should generate 6 ability scores', () => {
      const scores = characterService.generateAbilityScores();
      expect(scores).toHaveLength(6);
    });

    it('should generate scores between 3 and 18', () => {
      const scores = characterService.generateAbilityScores();
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      });
    });

    it('should generate realistic (4d6 drop lowest)', () => {
      // Run multiple times to check distribution is reasonable
      for (let i = 0; i < 10; i++) {
        const scores = characterService.generateAbilityScores();
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Average of 4d6 drop lowest is ~12.24
        expect(avg).toBeGreaterThan(10);
        expect(avg).toBeLessThan(14);
      }
    });
  });

  describe('calculateModifiers', () => {
    it('should calculate correct modifiers', () => {
      const scores = [10, 12, 14, 16, 8, 6];
      const modifiers = characterService.calculateModifiers(scores);
      expect(modifiers).toEqual([0, 1, 2, 3, -1, -2]);
    });

    it('should handle extreme scores', () => {
      const scores = [3, 18, 10, 10, 10, 10];
      const modifiers = characterService.calculateModifiers(scores);
      expect(modifiers[0]).toBe(-4); // (3-10)/2
      expect(modifiers[1]).toBe(4); // (18-10)/2
      expect(modifiers[2]).toBe(0);
    });
  });

  describe('applyRacialModifiers', () => {
    it('should apply Sangue Antico (Uomini) modifiers', () => {
      const scores = [10, 10, 10, 10, 10, 10];
      const modified = characterService.applyRacialModifiers(scores, 'Uomini', 'Sangue Antico');
      expect(modified[0]).toBe(11); // +1 STR
      expect(modified[2]).toBe(11); // +1 CON
      expect(modified[5]).toBe(11); // +1 CHA
    });

    it('should apply Elfi racial modifiers universally', () => {
      const scores = [10, 10, 10, 10, 10, 10];
      const modified = characterService.applyRacialModifiers(scores, 'Elfi', 'Alti Elfi');
      expect(modified[1]).toBe(12); // +2 DEX
      expect(modified[3]).toBe(11); // +1 INT
    });

    it('should apply Nani modifiers', () => {
      const scores = [10, 10, 10, 10, 10, 10];
      const modified = characterService.applyRacialModifiers(scores, 'Nani', 'Barbalunga');
      expect(modified[2]).toBe(12); // +2 CON (universal + extra)
    });

    it('should cap modifiers at 18', () => {
      const scores = [18, 18, 18, 18, 18, 18];
      const modified = characterService.applyRacialModifiers(scores, 'Bruti', 'Bruti');
      modified.forEach(score => {
        expect(score).toBeLessThanOrEqual(18);
      });
    });
  });

  describe('calculateHP', () => {
    it('should calculate HP for Guerriero', () => {
      const hp = characterService.calculateHP('Guerriero', 2); // +2 CON modifier
      expect(hp).toBe(12); // 10 + 2
    });

    it('should calculate HP for Ladro', () => {
      const hp = characterService.calculateHP('Ladro', 1);
      expect(hp).toBe(9); // 8 + 1
    });

    it('should ensure minimum HP of 1', () => {
      const hp = characterService.calculateHP('Sapiente', -10);
      expect(hp).toBe(1); // 6 - 10 = -4 → clamped to 1
    });
  });

  describe('calculateAC', () => {
    it('should calculate AC with DEX modifier', () => {
      const ac = characterService.calculateAC('Guerriero', 0);
      expect(ac).toBe(10); // Base 10

      const acWithDex = characterService.calculateAC('Ladro', 2);
      expect(acWithDex).toBe(13); // 11 + 2
    });

    it('should clamp AC to minimum 8', () => {
      const ac = characterService.calculateAC('Guerriero', -5);
      expect(ac).toBe(8); // 10 - 5 = 5 → clamped to 8
    });
  });

  describe('getStartingEquipment', () => {
    it('should return equipment for Guerriero', () => {
      const equipment = characterService.getStartingEquipment('Guerriero');
      expect(equipment).toHaveLength(3);
      expect(equipment.map(e => e.item_key)).toContain('longsword');
      expect(equipment.map(e => e.item_key)).toContain('shield_wood');
      expect(equipment.map(e => e.item_key)).toContain('armor_leather');
    });

    it('should return equipment for Ladro', () => {
      const equipment = characterService.getStartingEquipment('Ladro');
      expect(equipment.map(e => e.item_key)).toContain('lock_picks');
    });

    it('should return equipment for Ramingo', () => {
      const equipment = characterService.getStartingEquipment('Ramingo');
      expect(equipment.map(e => e.item_key)).toContain('longbow');
      expect(equipment.map(e => e.item_key)).toContain('arrow_bundle');
    });
  });

  describe('getStartingGold', () => {
    it('should return correct gold for each class', () => {
      expect(characterService.getStartingGold('Guerriero')).toBe(50);
      expect(characterService.getStartingGold('Ramingo')).toBe(40);
      expect(characterService.getStartingGold('Ladro')).toBe(60);
      expect(characterService.getStartingGold('Sapiente')).toBe(30);
      expect(characterService.getStartingGold('Guaritore')).toBe(40);
    });
  });
});
