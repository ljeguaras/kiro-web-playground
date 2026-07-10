import fs from "fs/promises";
import path from "path";
import { User } from "@/app/lib/definitions";

const DB_PATH = path.join(process.cwd(), "data", "users.json");

async function readUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeUsers(users: User[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
}

export async function getUserByUsername(
  username: string
): Promise<User | undefined> {
  const users = await readUsers();
  return users.find((user) => user.username === username);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await readUsers();
  return users.find((user) => user.id === id);
}

export async function createUser(
  username: string,
  hashedPassword: string
): Promise<User> {
  const users = await readUsers();
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
  };
  users.push(newUser);
  await writeUsers(users);
  return newUser;
}
