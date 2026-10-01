/**
 * Relative-link check for every Markdown file in the repository.
 *
 * The READMEs reach packages, docs, scripts and artwork by relative path, and
 * nothing else resolves those paths: a link written from the wrong depth, or
 * left behind by a rename, renders as plain text on GitHub and passes every
 * other check in this repository.
 *
 * Each target is resolved against the directory of the file that contains it.
 * Anchors are stripped, so a link to a heading is checked as a link to its
 * file; external links are not fetched.
 *
 * Run from anywhere:
 *   node scripts/check-links.mjs
 *
 * Repository-local tooling: not part of either plugin package.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKIPPED = new Set(['node_modules', '.git'])

/**
 * Every Markdown file below a directory, depth first.
 * @param {string} directory - absolute path to walk.
 * @returns {string[]} absolute paths, in directory order.
 */
function markdownFiles(directory) {
  const found = []
  for (const entry of readdirSync(directory)) {
    if (SKIPPED.has(entry)) continue
    const path = resolve(directory, entry)
    if (statSync(path).isDirectory()) found.push(...markdownFiles(path))
    else if (entry.endsWith('.md')) found.push(path)
  }
  return found
}

/**
 * Targets in one document that name a file rather than a URL or an anchor.
 * @param {string} source - the document's text.
 * @returns {string[]} repository-relative or file-relative targets, in order.
 */
function fileTargets(source) {
  return [...source.matchAll(/!?\[[^\]]*\]\(([^)\s]+?)(?:\s+"[^"]*")?\)/g)]
    .map(match => match[1])
    .filter(target => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(target))
    .map(target => decodeURIComponent(target.split('#')[0]))
    .filter(target => target.length > 0)
}

/** Report a path the way the document spells it, whatever the platform uses. */
const asLink = path => path.split(sep).join('/')

const missing = []
let files = 0
let links = 0

for (const file of markdownFiles(ROOT)) {
  files += 1
  for (const target of fileTargets(readFileSync(file, 'utf8'))) {
    links += 1
    if (!existsSync(resolve(dirname(file), target))) {
      missing.push(`${asLink(relative(ROOT, file))}  ->  ${target}`)
    }
  }
}

for (const link of missing) console.log(`MISSING  ${link}`)
console.log(`\n${links - missing.length}/${links} relative links resolve, across ${files} Markdown files`)
process.exitCode = missing.length === 0 ? 0 : 1
