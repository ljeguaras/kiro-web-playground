import { User } from "@/app/lib/definitions";

// In-memory store - users reset on cold starts (acceptable for demo auth)
const users = new Map<string, User>();

export async function getUserByUsername(
  username: string
): Promise<User | undefined> {
  for (const user of users.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  return users.get(id);
}

export async function createUser(
  username: string,
  hashedPassword: string
): Promise<User> {
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
  };
  users.set(newUser.id, newUser);
  return newUser;
}
