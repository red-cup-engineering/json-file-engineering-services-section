import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { jsonProjector, jsonlProjector } from '@red-cup-engineering/json-file-codec-service';
import { cellToEavt, eavtId, eavtProjector, eavtToCell, mergeEavtLogs, parse, serialize, toEavt } from '@red-cup-engineering/json-file-codec-service/jsonl/eavt';

test('merge repeated observations without erasing either side of the Okaga star record', () => {
  // Two observations from the shipped Okaga galaxy, in their original order.
  const text = '{"e":"vega-prime","a":"controlled-by","v":"federation","t":2}\n' +
    '{"e":"vega-prime","a":"not-controlled-by","v":"federation","t":3}\n';
  const rows = parse(text);
  assert.deepEqual(parse(serialize(rows)), rows);
  assert.equal(eavtProjector.recognize({content:text}), true);
  const ids = rows.map(row => createHash('sha256').update(JSON.stringify({a:row.a,e:row.e,t:row.t,v:row.v})).digest('hex'));
  assert.deepEqual(rows.map(eavtId), ids);
  assert.deepEqual(mergeEavtLogs(rows, rows.map(toEavt).reverse()).map(eavtId), ids.sort());
  for (const row of rows) assert.deepEqual(cellToEavt(eavtToCell(toEavt(row))), [toEavt(row)]);
});

test('recognition distinguishes a JSON document, JSON lines, and complete EAVT rows', () => {
  const mixed = {content:'["sol","at","station",1]\n{"a":"at","e":"sol","v":"another","t":2}\n'};
  assert.equal(jsonProjector.recognize(mixed), false);
  assert.equal(jsonlProjector.recognize(mixed), true);
  assert.equal(eavtProjector.recognize(mixed), true);
  assert.equal(eavtProjector.recognize({content:mixed.content+'{}\n'}), false);
  assert.equal(jsonlProjector.recognize({content:mixed.content+'{'}), false);
  assert.deepEqual(eavtProjector.read(mixed), mixed.content.trim().split('\n').map(s => JSON.parse(s)));
});
