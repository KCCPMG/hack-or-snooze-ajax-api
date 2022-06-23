"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();
  const $liBlock = $(`
    <li id="${story.storyId}">
      <a href="${story.url}" target="a_blank" class="story-link">
        ${story.title}
      </a>
      <small class="story-hostname">(${hostName})</small>
      <small class="story-author">by ${story.author}</small>
      <small class="story-user">posted by ${story.username}</small>
    </li>
  `);

  if (currentUser) {
    addLoggedInStoryMarkup($liBlock, story);
  }

  return $liBlock;
}

/**
 * Add markup to stories specific to logged in users:
 * For a logged in user, any post can be favorited/unfavorited
 * Deleting a post is only allowed for that post's creator
 */
function addLoggedInStoryMarkup ($origMarkup, story) {
  const $favIcon = generateFavoriteIcon(story);
  const $deleteIcon = generateDeleteIcon(story);
  $origMarkup.prepend($deleteIcon, $favIcon);

}


function generateFavoriteIcon(story) {
  const $starSpan = $('<span class="icon-span">');
  const $iStar = $('<i class="fa-star"></i>');
  
  // if this story is in currentUser favorites
  if (currentUser.favorites.find(f => f.storyId === story.storyId)) {
    // set correct display class, remove incorrect display class
    $iStar.addClass("fas");
    $iStar.removeClass("far");

    // set click handler
    $iStar.click(async function() {
      await currentUser.unfavorite(story.storyId);
      putStoriesOnPage();
    })
  } else {
    // set correct display class, remove incorrect display class
    $iStar.addClass("far");
    $iStar.removeClass("fas");

    // set click handler
    $iStar.click(async function() {
      await currentUser.favorite(story.storyId);
      putStoriesOnPage();
    })
  }
  $starSpan.append($iStar);
  return $starSpan;
}

/**
 * return delete icon if currentUser created this story, 
 * else return null
 */
function generateDeleteIcon(story) {
  // check if currentUser created this story
  if (currentUser.username !== story.username) {
    return null;
  }
  // else:

  const $deleteSpan = $('<span class="icon-span"</span>');
  const $deleteIcon = $('<i class="fas fa-trash-alt delete-icon"></i>');

  $deleteIcon.click(async function() {
    await currentUser.deleteStory(story);
    const response = await StoryList.getStories();
    storyList.stories = response.stories;
    putStoriesOnPage();
  });

  $deleteSpan.append($deleteIcon);

  return $deleteSpan;
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}


/* 
 * Write a function in stories.js that is called when
 * users submit the form. Pick a good name for it. 
 * This function should get the data from the form, 
 * call the .addStory method you wrote, and then put 
 * that new story on the page.
*/
async function submitStory(e) {
  e.preventDefault();
  const title = $("#title-input").val();
  const author = $("#author-input").val();
  const url = $("#url-input").val();
  await storyList.addStory(currentUser, {title, author, url});
  putStoriesOnPage();
}


$("#submit-story-form").submit(submitStory);
