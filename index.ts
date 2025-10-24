import dotenv from 'dotenv'
import fs from 'fs-extra'
import prompts from 'prompts'
import spawn from 'cross-spawn'
import pkg from 'lodash'

const { kebabCase } = pkg

dotenv.config({ path: '.env.local' })

const acfKey = process.env.ACF_PRO_LICENCE || ''
;(async () => {
  const response = await prompts([
    {
      type: 'text',
      message: 'Where should we create the project?',
      name: 'rootDir',
      initial: '../',
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

  const projectName = `${kebabCase(response.projectName)}-cms`
  const projectPath = `${response.rootDir}${projectName}`

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
    }
  )

  fs.moveSync(projectName, projectPath)

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

  spawn.sync('wp', ['plugin', 'activate', '--all', `--path=${projectPath}`], {
    stdio: 'inherit',
  })

  spawn.sync('wp', ['plugin', 'update', '--all', `--path=${projectPath}`], {
    stdio: 'inherit',
  })

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

  fs.writeFileSync(
    `${projectPath}/readme.md`,
    `Wordpress CMS for ${response.projectName} - Built from (wedo-headless-starter)[https://github.com/BennyHudson/wedo-headless-starter] - use \`wp server\` to run locally`
  )

  spawn.sync('git', ['add', '.'], { stdio: 'inherit' })
  spawn.sync('git', ['commit', '-m', 'Initial commit'], { stdio: 'inherit' })
  spawn.sync('git', ['push', '-u', 'origin', 'main'], { stdio: 'inherit' })

  spawn.sync(
    'wp',
    ['server', `--path=${projectPath}`, '--port=8000', '--silent'],
    {
      stdio: 'inherit',
    }
  )
})()
