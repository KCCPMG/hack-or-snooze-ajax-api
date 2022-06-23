"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */
 
  getHostName() {
    let trimmedUrl = this.url
    if (trimmedUrl.slice(0, 8) === "https://") {
      trimmedUrl = trimmedUrl.slice(8);
    } else if (trimmedUrl.slice(0, 7) === "http://") {
      trimmedUrl = trimmedUrl.slice(7);
    }

    let slashIndex = trimmedUrl.indexOf("/");
    if (slashIndex === -1) {
      return trimmedUrl;
    } else {
      return trimmedUrl.slice(0, slashIndex);
    }
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories() {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(  user, newStory ) {
    try {
      const response = await axios.post(`${BASE_URL}/stories`, {
        token: user.loginToken,
        story: newStory
      });
      const savedStory = new Story(response.data.story);
      storyList.stories.unshift(savedStory);
      return savedStory;
    } catch(e) {
      console.error(e);
    }
  }
}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    const response = await axios({
      url: `${BASE_URL}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios({
      url: `${BASE_URL}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  /**
   * API request to add story to favorites
   * Update this.favorites from updated user in response
   */
  async favorite(storyId) {
    try {
      const response = await axios.post(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
        token: this.loginToken
      });
      this.favorites = response.data.user.favorites;
    } catch(e) {
      console.error(e);
    }
  }

  /**
   * API request to delete story from favorites
   * Update this.favorites from updated user in response
   */
  async unfavorite(storyId) {
    try {
      const response = await axios.delete(`${BASE_URL}/users/${this.username}/favorites/${storyId}`, {
        data: {
          token: this.loginToken
        }
      });
      this.favorites = response.data.user.favorites;
    } catch(e) {
      console.error(e);
    }
  }

  /**
   * API request to delete story that was added by this user
   * On success, this API endpoint responds with a String
   * confirming deletion and a copy of the deleted story.
   * I'm choosing not to return from here, but to instead 
   * get a full refresh of stories in the UI function that
   * calls deleteStory
   */
  async deleteStory(story) {
    try {
      await axios.delete(`${BASE_URL}/stories/${story.storyId}`, {
        data: {
          token: this.loginToken
        }
      })
    } catch(e) {
      console.error(e);
    }
  }
}
