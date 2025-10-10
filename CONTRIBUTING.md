# Contributing to Portfolio

First off, thank you for considering contributing to Portfolio! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed**
- **Explain which behavior you expected to see instead**
- **Include screenshots if possible**
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Pull Requests

1. **Fork the repository** and create your branch from `develop`
2. **Make your changes** following our coding standards
3. **Write tests** for your changes
4. **Ensure all tests pass** (`make test`)
5. **Update documentation** if needed
6. **Commit your changes** using conventional commits
7. **Push to your fork** and submit a pull request

## Development Process

### 1. Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/kinzen.git
cd kinzen

# Install dependencies
make install

# Setup Git hooks
make setup-hooks

# Start development servers
make dev
```

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bugfix branch
git checkout -b bugfix/your-bugfix-name
```

### 3. Make Your Changes

Follow our coding standards:

- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Write unit tests for new features

### 4. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

git commit -m "feat(backend): add user profile endpoint"
git commit -m "fix(frontend): resolve login form validation"
git commit -m "docs: update API documentation"
git commit -m "test(backend): add user service tests"
git commit -m "refactor(frontend): improve authentication hook"
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes

### 5. Run Tests

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run linter
make lint

# Format code
make format
```

### 6. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use strict mode
- Avoid `any` type
- Use interfaces for object shapes
- Use type aliases for unions/primitives
- Export types that are used across modules

```typescript
// Good
interface User {
  id: string;
  email: string;
}

// Bad
const user: any = { ... };
```

### Backend (NestJS)

- Follow Clean Architecture principles
- Use dependency injection
- Keep controllers thin
- Business logic in services/handlers
- Use DTOs for validation
- Write repository interfaces

```typescript
// Good
@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}
}

// Bad - direct database access in controller
@Controller("users")
export class UserController {
  async getUser() {
    return await prisma.user.findMany();
  }
}
```

### Frontend (Next.js)

- Use functional components
- Use hooks for state and effects
- Keep components small and focused
- Extract reusable logic into hooks
- Use proper TypeScript types

```typescript
// Good
interface Props {
  user: User;
  onUpdate: (user: User) => void;
}

export function UserProfile({ user, onUpdate }: Props) {
  // ...
}

// Bad
export function UserProfile(props: any) {
  // ...
}
```

### Testing

- Write tests for new features
- Aim for > 80% code coverage
- Test edge cases
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe("UserService", () => {
  it("should create a new user with valid data", async () => {
    // Arrange
    const userData = { email: "test@example.com", password: "password" };

    // Act
    const user = await userService.create(userData);

    // Assert
    expect(user.email).toBe(userData.email);
  });
});
```

## Project Structure

```
backend/
├── src/
│   ├── modules/          # Feature modules
│   │   └── users/
│   │       ├── domain/          # Business logic
│   │       ├── application/     # Use cases
│   │       ├── infrastructure/  # Data access
│   │       └── presentation/    # Controllers/DTOs
│   ├── shared/           # Shared utilities
│   └── config/           # Configuration

frontend/
├── src/
│   ├── app/              # Next.js pages
│   ├── features/         # Feature modules
│   └── shared/           # Shared components
```

## Questions?

Feel free to open an issue or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🚀
