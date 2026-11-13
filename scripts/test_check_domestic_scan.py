import contextlib
import io
import json
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

import check_domestic_scan


class SmokeCheckTest(unittest.TestCase):
    def response(self, status='success', stale=False):
        checked = datetime.now(timezone.utc) - timedelta(minutes=10 if stale else 0)
        return {
            'movers': [{'symbol': '005930'}],
            'checkedAt': checked.isoformat(),
            'markets': [{'market': m, 'status': status, 'count': 1, 'rejectedCount': 0}
                        for m in ['KOSPI', 'KOSDAQ']],
        }

    def run_check(self, response):
        with patch('urllib.request.urlopen', return_value=io.StringIO(json.dumps(response))), \
                contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return check_domestic_scan.main()

    def test_healthy_boards_pass(self):
        self.assertEqual(self.run_check(self.response()), 0)

    def test_empty_partial_error_and_unconfigured_do_not_pass(self):
        for status in ['empty', 'partial', 'error', 'not_configured']:
            with self.subTest(status=status):
                self.assertEqual(self.run_check(self.response(status)), 1)

    def test_stale_or_missing_board_does_not_pass(self):
        self.assertEqual(self.run_check(self.response(stale=True)), 1)
        response = self.response()
        response['markets'].pop()
        self.assertEqual(self.run_check(response), 1)


if __name__ == '__main__':
    unittest.main()
