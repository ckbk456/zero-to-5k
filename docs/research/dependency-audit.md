# Bootstrap dependency audit

Snapshot: 2026-10-16, `npm audit --json`, npm 11.13.0, committed lockfile. Registry advisories can change; rerun before releases.

The audit reports 29 affected dependency entries: 18 high, 11 moderate, zero critical. Parent package propagation contributes to that count. Four underlying advisory families were reported:

| Package                    | Severity | Advisory                                                                                        | Dependency context                   |
| -------------------------- | -------- | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| braces 3.0.3               | High     | [Nested-pattern stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)            | micromatch / Metro tooling           |
| node-forge 1.4.0           | High     | [RSA signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv)                 | Expo CLI signing/certificate tooling |
| uuid 7.0.3                 | Moderate | [Buffer bounds checks](https://github.com/advisories/GHSA-w5hq-g745-h8pq)                       | Native project configuration tooling |
| decode-uri-component 0.2.2 | Moderate | [Malformed-input decoding denial of service](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | query-string / Expo Router           |

This is dependency presence, not a completed exploitability assessment. The Router dependency deserves runtime review; toolchain dependencies also need assessment. No claim of a vulnerability-free app is made.

Do not use `npm audit fix --force`: npm's proposed dependency substitutions included incompatible Expo/React Native versions. No unverified major-version overrides were applied. Track compatible upstream patches, validate upgrades with the repository gates, and reassess exposure before any app release. Public source publication is not a signed app release.
