# Hero Discovery Module

First-screen discovery for a travel social network. It focuses on user intent: where to go, what kind of trip they want, and why the featured destination is worth opening.

## Usage

```tsx
import { HeroDiscovery, createHeroDiscoveryViewModel, HERO_DISCOVERY_MOCK } from "./modules/hero-discovery";
import "./modules/hero-discovery/styles.css";

const hero = createHeroDiscoveryViewModel(HERO_DISCOVERY_MOCK);

<HeroDiscovery vm={hero} onSearch={(query) => console.log(query)} />
```

## Placement

Use this as the first module on a discovery page. Pair it with `trending-destinations`, `social-feed`, and `travel-articles`.
