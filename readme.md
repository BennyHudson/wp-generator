# wp-generator

Simple node script for creating a headless WordPress back end using the [wedo.digital Headless WordPress Starter](https://github.com/BennyHudson/wedo-headless-starter) repo.

## Prerequisites

In order to correctly run this package, you will need to have [wp-cli](https://wp-cli.org/) and [mySql](https://dev.mysql.com/doc/refman/8.4/en/mysql.html) installed on your machine.

## Installation

You can install the package globally using npm:

```bash
npm install -g @bennyhudson/wp-generator
```

Or using yarn:

```bash
yarn global add @bennyhudson/wp-generator
```

## Usage

Once installed globally, you can run the generator from anywhere using:

```bash
generate-wp-cms
```

The generator will prompt you for:

- Project directory location
- Project name
- WordPress admin username
- WordPress admin password
- WordPress admin email
- ACF Pro license key (optional)

### Environment Variables

You can set up default values using a `.env.local` file in the directory where you run the command. For example:

1. If you want to use the generator in your projects directory:

```bash
cd ~/projects
touch .env.local
```

2. Add your ACF Pro license to the `.env.local` file:

```env
ACF_PRO_LICENCE=your_acf_pro_license_key
```

The generator will look for the `.env.local` file in the current working directory when you run `generate-wp-cms`.

## Development

To work on the package locally:

1. Clone the repository

```bash
git clone https://github.com/BennyHudson/wp-generator.git
cd wp-generator
```

2. Install dependencies

```bash
yarn install
```

3. Run locally

```bash
yarn generate
```
