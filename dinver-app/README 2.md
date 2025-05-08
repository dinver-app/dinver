# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment variables

   Create a `.env` file at the root of the project with the following variables:
   ```
   # API Configuration
   EXPO_PUBLIC_API_BASE_URL=https://api.dinver.eu/api/app
   EXPO_PUBLIC_MOBILE_APP_API_KEY=your_api_key

   # Google Places API 
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
   EXPO_PUBLIC_GOOGLE_PLACES_AUTOCOMPLETE_URL=https://maps.googleapis.com/maps/api/place/autocomplete/json
   EXPO_PUBLIC_GOOGLE_PLACES_DETAILS_URL=https://maps.googleapis.com/maps/api/place/details/json
   EXPO_PUBLIC_GOOGLE_PLACES_GEOCODE_URL=https://maps.googleapis.com/maps/api/geocode/json
   ```

3. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
