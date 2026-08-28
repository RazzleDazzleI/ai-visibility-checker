import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, summarise, hostOf } from '../server/citations.js';

test('classifies known directories', () => {
  assert.equal(classify('https://www.yelp.com/biz/x'), 'directory');
  assert.equal(classify('https://bbb.org/us/ne/omaha'), 'directory');
  assert.equal(classify('https://www.angi.com/companylist'), 'directory');
});

test('business domain wins over every other rule', () => {
  assert.equal(classify('https://acme.com/services', 'acme.com'), 'first_party');
  assert.equal(classify('https://blog.acme.com/post', 'acme.com'), 'first_party');
  assert.equal(classify('https://acme.com/x', null), 'other', 'without a domain it cannot be first_party');
});

test('strips www when matching', () => {
  assert.equal(hostOf('https://www.acme.com/x'), 'acme.com');
  assert.equal(classify('https://www.acme.com/x', 'www.acme.com'), 'first_party');
});

test('invalid urls are bucketed, never thrown', () => {
  assert.equal(classify('not a url'), 'invalid');
  assert.equal(summarise(['not a url']).counts.invalid, 1);
});

test('diagnosis: directory-only is the actionable case', () => {
  const s = summarise(['https://yelp.com/biz/x', 'https://bbb.org/y'], 'acme.com');
  assert.equal(s.diagnosis, 'directory_only');
});

test('diagnosis: first-party citation outranks directories', () => {
  const s = summarise(['https://yelp.com/biz/x', 'https://acme.com/'], 'acme.com');
  assert.equal(s.diagnosis, 'retrieved_directly');
});

test('diagnosis: no citations is distinct from not mentioned', () => {
  assert.equal(summarise([]).diagnosis, 'no_citations');
});
