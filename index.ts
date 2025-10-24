import dotenv from 'dotenv'
import prompts from 'prompts'

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
      initial: 'my-wp-project',
    },
    {
      type: 'text',
      message: 'Do you have an ACF Pro license key? (leave blank to skip)',
      name: 'acfProKey',
      initial: acfKey,
    },
  ])
  console.log(response)
})()
