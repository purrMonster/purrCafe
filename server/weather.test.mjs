import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherReading} from './data.mjs';
test('weather readings expose only valid temperature, units, and humidity',()=>{
  assert.deepEqual(weatherReading({temperature:30.4,temperature_unit:'°C',humidity:66,latitude:1,longitude:2}),{temperature:30.4,unit:'°C',humidity:66});
  assert.equal(weatherReading({temperature:null}),null);
  assert.equal(weatherReading(null),null);
  assert.equal(weatherReading({temperature:Infinity}),null);
  assert.deepEqual(weatherReading({temperature:0,temperature_unit:'unsafe unit',humidity:150}),{temperature:0,unit:'',humidity:null});
});
