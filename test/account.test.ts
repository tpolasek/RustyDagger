import { equal, ok } from 'node:assert/strict';
import { test } from 'node:test';
import { FileLoader } from '../src/ts/DCourt/Tools/FileLoader';

test('accounts are created on first login and verified afterwards', () => {
  equal(FileLoader.hasAccount('Amber'), false);
  FileLoader.createAccount('Amber', 'swordfish');
  equal(FileLoader.hasAccount('Amber'), true);
  equal(FileLoader.checkPassword('Amber', 'swordfish'), true);
});

test('a wrong password is rejected without creating a second account', () => {
  FileLoader.createAccount('Bravo', 'right');
  equal(FileLoader.checkPassword('Bravo', 'wrong'), false);
  equal(FileLoader.checkPassword('Bravo', 'right'), true);
});

test('heroes still save and load alongside accounts', () => {
  FileLoader.createAccount('Charlie', 'opensesame');
  const saved = FileLoader.saveHero('Charlie', '{itHero|Charlie}');
  equal(saved.isError(), false);
  const loaded = FileLoader.loadHero('Charlie');
  equal(loaded.toString(), '{itHero|Charlie}');
});

test('wipeSaves removes heroes, accounts and version keys', () => {
  FileLoader.createAccount('Delta', 'pass');
  FileLoader.saveHero('Delta', '{itHero|Delta}');
  const wiped = FileLoader.wipeSaves();
  ok(wiped >= 2, `expected at least 2 keys wiped, got ${wiped}`);
  equal(FileLoader.hasAccount('Delta'), false);
  equal(FileLoader.loadHero('Delta').toString(), '');
});

test('migrateSaveVersion wipes once and then leaves later saves alone', () => {
  FileLoader.wipeSaves();
  FileLoader.createAccount('Old', 'before');
  FileLoader.migrateSaveVersion();
  equal(FileLoader.hasAccount('Old'), false);

  FileLoader.createAccount('Echo', 'after');
  FileLoader.migrateSaveVersion();
  equal(FileLoader.hasAccount('Echo'), true);
});
