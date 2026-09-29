// A very small test runner, so the tests need nothing installed: run them
// with the JavaScript engine every Mac already has (see tools/test.sh).

const results = [];

export function test(name, body)
{
  try
  {
    body();
    results.push({ name, ok: true });
  }
  catch (error)
  {
    results.push({ name, ok: false, message: error.message });
  }
}

export function equal(actual, expected, what = '')
{
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e)
  {
    throw new Error(`${what ? `${what}: ` : ''}expected ${e}, got ${a}`);
  }
}

export function ok(value, what = 'expected true')
{
  if (!value)
  {
    throw new Error(what);
  }
}

// Prints every result; the last line is what tools/test.sh checks.
export function report()
{
  let failed = 0;
  for (const result of results)
  {
    if (result.ok)
    {
      print(`  ok   ${result.name}`);
    }
    else
    {
      failed += 1;
      print(`  FAIL ${result.name}\n       ${result.message}`);
    }
  }
  print(failed === 0 ? `PASSED ${results.length}` : `FAILED ${failed} of ${results.length}`);
}
