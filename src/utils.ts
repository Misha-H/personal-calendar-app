import type { User } from './types';

interface Db<T> {
  /**
   * Database name.
   * @remarks `LocalStorage` key.
   */
  name: string;

  /**
   * Database structure.
   */
  db: T;
}

interface UsersDictionary {
  [userId: string]: User;
}

interface UsersDb extends Db<UsersDictionary> {
  activeUserKey: string;
  activeUser: null | User;
  save(): void;
  read(): void;
  init(): void;
  addUser(user: Omit<User, 'id'>): void;
  login(username: User['username'], password: User['password']): User | null;
  logout(): void;
  removeUser(id: User['id']): void;
  getActiveUser(): User | null;
  setActiveUser(id?: User['id']): void;
}

export const usersDb: UsersDb = {
  name: 'users',
  activeUserKey: 'users__activeUser',
  db: {},
  activeUser: null,
  save() {
    localStorage.setItem(this.name, JSON.stringify(this.db));
    console.log('[DB]: SAVE');
  },
  read() {
    this.db = JSON.parse(localStorage.getItem(this.name)!);
  },
  init() {
    if (localStorage.getItem(this.name) === null) {
      console.log('[DB]: CREATE');
      // Save default value to database/local storage
      this.save();
    } else {
      console.log('[DB]: READ');
      this.read();
      console.log(this.db);
    }
  },
  addUser(user) {
    // Temperary simple way to create an ID
    const id = Date.now().toString(16);

    this.db[id] = { ...user, id: id };
    this.save();
  },
  removeUser(id) {
    delete this.db[id];
    this.save();
  },
  setActiveUser(id) {
    // If no user id is passed, assume logout and set active user to `null`
    this.activeUser = id ? this.db[id] : null;
    localStorage.setItem(this.activeUserKey, JSON.stringify(this.activeUser));
  },
  getActiveUser() {
    this.activeUser = JSON.parse(localStorage.getItem(this.activeUserKey)!);
    return this.activeUser;
  },
  login(username, password) {
    // Get all the ids (keys)
    const ids = Object.keys(this.db);

    // For each user
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const user = this.db[id];

      // If the entered username and password match a user
      if (user.username === username && user.password === password) {
        // Set the active user (login)
        this.setActiveUser(id);
        return this.getActiveUser();
      }
    }

    return null;
  },
  logout() {
    // Log the active user out
    this.setActiveUser();
    window.location.href = '/';
    return true;
  },
};
