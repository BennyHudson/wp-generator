#!/usr/bin/env node

import dotenv from 'dotenv'
import fs from 'fs-extra'
import prompts from 'prompts'
import spawn from 'cross-spawn'
import pkg from 'lodash'
import path from 'node:path'

const { kebabCase } = pkg

dotenv.config({ path: '.env.local' })

const acfKey = process.env.ACF_PRO_LICENCE || ''
;(async () => {
  const response = await prompts([
    {
      type: 'text',
      message: 'Where should we create the project?',
      name: 'rootDir',
      initial: path.resolve(process.cwd()),
    },
    {
      type: 'text',
      message: 'What is the project name?',
      name: 'projectName',
      initial: 'My WordPress Project',
    },
    {
      type: 'text',
      message: 'WordPress admin username?',
      name: 'wpAdminUser',
      initial: 'admin',
    },
    {
      type: 'password',
      message: 'WordPress admin password?',
      name: 'wpAdminPass',
      initial: 'password',
    },
    {
      type: 'text',
      message: 'WordPress admin email?',
      name: 'wpAdminEmail',
      initial: 'admin@example.com',
    },
    {
      type: 'text',
      message: 'Do you have an ACF Pro license key? (leave blank to skip)',
      name: 'acfProKey',
      initial: acfKey,
    },
  ])

  // derive a safe project name and final path
  let projectName = `${kebabCase(response.projectName.replace('WordPress', 'wordpress'))}-cms`
  // ensure rootDir exists
  fs.ensureDirSync(response.rootDir)
  let projectPath = path.join(response.rootDir, projectName)

  // if destination already exists, append a timestamp to make the name unique
  if (fs.existsSync(projectPath)) {
    const suffix = `-${Date.now()}`
    projectName = `${projectName}${suffix}`
    projectPath = path.join(response.rootDir, projectName)
    console.warn(
      `Target path exists — using unique project name: ${projectName}`
    )
  }

  // Create the GitHub repo and clone directly into the chosen root directory so
  // we avoid moving across directories and potential "dest already exists" errors.
  spawn.sync(
    'gh',
    [
      'repo',
      'create',
      projectName,
      '--template=https://github.com/BennyHudson/wedo-headless-starter',
      '--public',
      '--clone',
    ],
    {
      stdio: 'inherit',
      cwd: response.rootDir,
    }
  )

  spawn.sync(
    'wp',
    ['core', 'download', `--path=${projectPath}`, '--skip-content'],
    { stdio: 'inherit' }
  )

  spawn.sync(
    'wp',
    [
      'config',
      'create',
      `--path=${projectPath}`,
      `--dbname=${projectName}`,
      '--dbuser=root',
      '--dbpass=root',
      '--dbhost=127.0.0.1',
    ],
    { stdio: 'inherit' }
  )

  spawn.sync('wp', ['db', 'create', `--path=${projectPath}`])

  if (response.acfProKey) {
    spawn.sync(
      'wp',
      [
        'config',
        'set',
        'ACF_PRO_LICENCE',
        response.acfProKey,
        `--path=${projectPath}`,
      ],
      { stdio: 'inherit' }
    )
  }

  spawn.sync(
    'wp',
    [
      'core',
      'install',
      `--path=${projectPath}`,
      `--url=${projectName}.local`,
      `--title=${response.projectName}`,
      `--admin_user=${response.wpAdminUser}`,
      `--admin_password=${response.wpAdminPass}`,
      `--admin_email=${response.wpAdminEmail}`,
    ],
    { stdio: 'inherit' }
  )

  spawn.sync('wp', ['plugin', 'update', '--all', `--path=${projectPath}`], {
    stdio: 'inherit',
  })

  spawn.sync('wp', ['plugin', 'activate', '--all', `--path=${projectPath}`], {
    stdio: 'inherit',
  })

  spawn.sync(
    'wp',
    [
      'plugin',
      'install',
      'add-wpgraphql-seo',
      'wordpress-seo',
      '--activate',
      `--path=${projectPath}`,
    ],
    {
      stdio: 'inherit',
    }
  )

  spawn.sync(
    'wp',
    ['language', 'plugin', 'update', '--all', `--path=${projectPath}`],
    {
      stdio: 'inherit',
    }
  )

  spawn.sync(
    'wp',
    ['language', 'theme', 'update', '--all', `--path=${projectPath}`],
    {
      stdio: 'inherit',
    }
  )

  spawn.sync(
    'wp',
    ['theme', 'activate', 'wedo-headless', `--path=${projectPath}`],
    {
      stdio: 'inherit',
    }
  )

  const currentReadme = fs.readFileSync(`${projectPath}/readme.md`, 'utf-8')

  const newReadme = `Wordpress CMS for ${response.projectName} - Built from [wedo-headless-starter](https://github.com/BennyHudson/wedo-headless-starter) - use \`wp server\` to run locally.

---

${currentReadme}`

  fs.writeFileSync(`${projectPath}/readme.md`, newReadme)
  // Ensure git is available in the project directory. If the template clone did not
  // leave a `.git` directory (some GH template operations can behave differently),
  // attempt to initialize a repo and attach the remote automatically.
  const gitDir = path.join(projectPath, '.git')
  const gitOpts: any = { stdio: 'inherit', cwd: projectPath }

  fs.removeSync(`${projectPath}/readme.html`)

  if (!fs.existsSync(gitDir)) {
    console.warn(
      'No .git directory found — attempting to initialize a git repository and attach remote'
    )

    // try to discover the repository URL using the GitHub CLI
    let repoUrl = ''
    try {
      const view = spawn.sync(
        'gh',
        ['repo', 'view', projectName, '--json', 'url', '--jq', '.url'],
        { encoding: 'utf8' }
      )
      if (view && typeof view.stdout === 'string') {
        repoUrl = view.stdout.trim()
      }
    } catch (err) {
      // ignore - we'll still init a local repo
    }

    // initialize local repo
    spawn.sync('git', ['init'], gitOpts)

    if (repoUrl) {
      // attach remote and attempt to fetch remote branches
      spawn.sync('git', ['remote', 'add', 'origin', repoUrl], gitOpts)
      const fetchRes = spawn.sync('git', ['fetch', 'origin'], gitOpts)
      if (fetchRes.status === 0) {
        // try to set up main branch to track origin/main
        spawn.sync(
          'git',
          ['checkout', '-b', 'main', '--track', 'origin/main'],
          gitOpts
        )
      }
    }
  }

  // Run git operations inside the project directory and tolerate non-fatal failures
  const addRes = spawn.sync('git', ['add', '.'], gitOpts)
  if (addRes.status !== 0) {
    console.warn('git add returned non-zero status; continuing')
  }

  const commitRes = spawn.sync(
    'git',
    ['commit', '-m', 'Initial commit'],
    gitOpts
  )
  if (commitRes.status !== 0) {
    console.warn(
      'git commit returned non-zero status; there may be nothing to commit'
    )
  }

  const pushRes = spawn.sync('git', ['push', '-u', 'origin', 'main'], gitOpts)
  if (pushRes.status !== 0) {
    console.warn(
      'git push returned non-zero status; you may need to push or configure the remote manually'
    )
  }

  spawn.sync(
    'wp',
    ['server', `--path=${projectPath}`, '--port=8000', '--quiet'],
    {
      stdio: 'inherit',
    }
  )
})()
