'use strict';

// The excluded-sites list: one host per line, each also covering its
// subdomains. A leading "*." is accepted and ignored.
function siteEntries(list) {
  return list.split('\n')
    .map(line => line.trim().toLowerCase().replace(/^\*\.?/, ''))
    .filter(Boolean);
}

function siteEntryMatches(entry, host) {
  host = host.toLowerCase();
  return host === entry || host.endsWith('.' + entry);
}

function siteListMatches(list, host) {
  return siteEntries(list).some(entry => siteEntryMatches(entry, host));
}
