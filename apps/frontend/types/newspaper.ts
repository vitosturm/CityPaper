export interface WeatherDay {
  day: string;
  temp: number;
  description: string;
}

export interface Weather {
  current: {
    temp: number;
    feelsLike: number;
    description: string;
    icon: string;
  };
  forecast: WeatherDay[];
}

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
}

export interface News {
  politics: NewsArticle[];
  sports: NewsArticle[];
  culture: NewsArticle[];
}

export interface CityInfo {
  summary: string;
  highlights: string[];
  population: number;
}

export interface Editorial {
  storyOfTheDay: string;
  editorsNote: string;
}

export interface Activity {
  name: string;
  description: string;
  category: string;
  unsplashQuery: string;
}

export interface Newspaper {
  city: string;
  generatedAt: string;
  weather: Weather;
  news: News;
  cityInfo: CityInfo;
  editorial: Editorial;
  activities: Activity[];
}
