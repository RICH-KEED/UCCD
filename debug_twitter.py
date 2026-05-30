import os, sys, asyncio
sys.path.insert(0, "/app")
os.environ.setdefault("TWITTER_USERNAME", os.getenv("TWITTER_USERNAME", "Pallindromez"))
os.environ.setdefault("TWITTER_AUTH_TOKEN", os.getenv("TWITTER_AUTH_TOKEN", "faec72c7e683a87d23d399090c553e385dcdd514"))

from tweety import Twitter as TweetyClient

async def main():
    client = TweetyClient(os.getenv("TWITTER_USERNAME"))
    await client.load_auth_token(os.getenv("TWITTER_AUTH_TOKEN"))
    
    if not client.me:
        print("NOT AUTHENTICATED")
        return
    
    print(f"Authenticated as @{client.me.screen_name}")
    print(f"Statuses count: {client.me.statuses_count}")
    
    print("\nAttempting to post a test tweet...")
    try:
        tweet = await client.create_tweet("Test tweet from UCCD bot - this is a connectivity check. Please ignore.", reply_to=None)
        print(f"SUCCESS! Tweet ID: {tweet.id}")
        print(f"Tweet URL: https://twitter.com/{client.me.screen_name}/status/{tweet.id}")
    except Exception as e:
        print(f"FAILED to create tweet: {type(e).__name__}: {e}")

asyncio.run(main())