#!/usr/bin/env python3
"""Read-only live smoke check through the backend; no KIS credentials on this client."""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone


def main():
    base = os.environ.get('BACKEND_URL', 'http://localhost:8080').rstrip('/')
    url = base + '/api/stocks/movers/scan?region=domestic&limit=30'
    try:
        with urllib.request.urlopen(url, timeout=40) as response:
            scan = json.load(response)
        markets = scan['markets']
        if len(markets) != 2 or {m['market'] for m in markets} != {'KOSPI', 'KOSDAQ'}:
            raise ValueError('Missing market diagnostics')
        checked = datetime.fromisoformat(scan['checkedAt'].replace('Z', '+00:00'))
        if abs((datetime.now(timezone.utc) - checked).total_seconds()) > 120:
            raise ValueError('Stale scan response')
        movers = scan['movers']
        if not isinstance(movers, list):
            raise ValueError('Invalid candidate list')
        passed = bool(movers)
        for market in markets:
            # Print only bounded diagnostic fields, never response bodies or URLs.
            board = market['market']
            status = market.get('status')
            count = market.get('count')
            rejected = market.get('rejectedCount')
            healthy = status == 'success' and isinstance(count, int) and count > 0 and rejected == 0
            print(f'{board}: {"PASS" if healthy else "NOT VERIFIED"}')
            passed = passed and healthy
        print(f'Domestic scan: {"PASS" if passed else "NOT VERIFIED (inspect server diagnostics)"}')
        return 0 if passed else 1
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        print('Domestic scan: NOT VERIFIED (request failed or invalid response)', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
