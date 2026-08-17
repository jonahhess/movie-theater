# Movie Theater Project — New User Setup Guide

This guide walks a new developer through setting up the project locally on macOS.

## 1. Project structure

Before starting, make sure the project has a structure similar to:

```text
project-root/
├── server/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── requirements.txt       # Only if the project requires it
│   ├── alembic/
│   └── ...
└── ...
```

The exact structure may differ depending on the project.

---

## 2. Install the required system tools

The project uses Python, MySQL, Redis, and `uv`.

If you use Homebrew, install the required services/tools:

```bash
brew update
brew install mysql redis uv
```

If you use `asdf` to manage Python versions, make sure the required Python version is already installed and selected.

For example:

```bash
asdf which python
```

This should return the Python executable that the project should use.

> **Note:** `brew update` is useful when preparing a new machine, but `brew upgrade` is not required as part of every project setup.

---

## 3. Set up the Python environment

Move into the server directory:

```bash
cd server
```

Create a virtual environment using the project's Python:

```bash
uv venv --python "$(asdf which python)"
```

Activate it:

```bash
source .venv/bin/activate
```

Then install the project's dependencies:

```bash
uv sync
```

`uv sync` should be the normal way to install dependencies when the project has a `pyproject.toml` and `uv.lock`.

### Do not create multiple virtual environments

The original setup created both:

```bash
python -m venv venv
```

and later:

```bash
uv venv ...
```

Only one is necessary. Use `.venv` with `uv`.

Similarly, there is no need to run:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

if the project is managed with `uv` and its dependencies are defined in `pyproject.toml`.

If `requirements.txt` is required for deployment or another tool, keep it in the repository, but avoid using it as a second dependency-management workflow during local development.

---

## 4. Set up MySQL

Start the MySQL service:

```bash
brew services start mysql
```

For a fresh MySQL installation, run the security setup:

```bash
mysql_secure_installation
```

Follow the prompts to configure the MySQL installation.

Then connect to MySQL as an administrator:

```bash
mysql -u root -p
```

---

## 5. Create the application database

Inside the MySQL shell, create the database:

```sql
CREATE DATABASE movie_theater
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

---

## 6. Create database users

Create an administrative application user:

```sql
CREATE USER 'movie_theater_admin'@'localhost'
IDENTIFIED BY 'REPLACE_WITH_A_SECURE_PASSWORD';
```

Create a read-only user:

```sql
CREATE USER 'movie_theater_viewer'@'localhost'
IDENTIFIED BY 'REPLACE_WITH_A_SECURE_PASSWORD';
```

Grant the required permissions to the administrator:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP
ON movie_theater.*
TO 'movie_theater_admin'@'localhost';
```

Grant read-only access to the viewer:

```sql
GRANT SELECT
ON movie_theater.*
TO 'movie_theater_viewer'@'localhost';
```

Apply the changes:

```sql
FLUSH PRIVILEGES;
```

Exit MySQL:

```sql
EXIT;
```

### Security note

Do **not** commit real database passwords to Git.

The passwords from the original setup log should be treated as examples only. Store real credentials in environment variables or an untracked `.env` file.

For example:

```text
DATABASE_USER=movie_theater_admin
DATABASE_PASSWORD=<your-local-password>
DATABASE_NAME=movie_theater
```

---

## 7. Set up Alembic

Alembic is used for database migrations.

If Alembic is not already included in the project's dependencies, add it with `uv`:

```bash
uv add alembic
```

There is no need to run:

```bash
pip install alembic
```

when `uv` is managing the project dependencies.

If Alembic has not yet been initialized in the repository:

```bash
alembic init --template pyproject alembic
```

If the `alembic/` directory already exists in the repository, **do not run the initialization command again**.

---

## 8. Set up Redis

Install Redis if it was not installed in step 2:

```bash
brew install redis
```

Start the Redis service:

```bash
brew services start redis
```

You can check that the service is running with:

```bash
brew services list
```

---

## 9. Final setup checklist

At this point, the local development environment should have:

- [ ] The project cloned/downloaded
- [ ] The required Python version installed
- [ ] A `.venv` virtual environment created with `uv`
- [ ] Python dependencies installed with `uv sync`
- [ ] MySQL installed
- [ ] MySQL service running
- [ ] `movie_theater` database created
- [ ] Application database users created
- [ ] Database credentials configured locally
- [ ] Alembic configured
- [ ] Redis installed
- [ ] Redis service running

---

## Recommended setup flow

For a new developer, the complete flow should be approximately:

```bash
# 1. Install system dependencies
brew update
brew install mysql redis uv

# 2. Enter the server
cd server

# 3. Create and activate Python environment
uv venv --python "$(asdf which python)"
source .venv/bin/activate

# 4. Install project dependencies
uv sync

# 5. Set up MySQL
brew services start mysql
mysql_secure_installation

# 6. Create the database and users
mysql -u root -p

# 7. Set up Redis
brew services start redis

# 8. Run database migrations
alembic upgrade head
```

The database/user SQL from the MySQL section should be executed during step 6.

This gives new users **one Python environment, one dependency-management workflow, and a clear order for configuring the database and services**.
