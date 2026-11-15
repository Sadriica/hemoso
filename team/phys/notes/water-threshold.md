# What OCHMO actually says about 2.5 L of water

Sun 15 Nov, 11:47. Read from the PDF
(https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-027-water.pdf, 11 pages).

## The exact text

Two places say the same number:

> NASA-STD-3001 technical requirements for water intake: **2.5 L/day for direct
> consumption and for rehydration of food** (black line), extra 0.24 L/hour for EVA.

> Potable Water for Hydration: **Minimum 2.5 L (84.5 fl oz) per crewmember per day**
> (allocation to include 600 mL per meal per crewmember to be available as Hot Water).

## What the same page says about real intake

The background graph gives measured intake by programme, in litres per day:

| Programme | Water intake |
| --- | --- |
| Apollo | ~1.6 +/- 0.2 |
| Skylab | ~2.8 +/- 0.5 |
| Shuttle | ~2.2 |
| ISS (E1-13, E14-25, E26-37) | ~2.2 |

## The consequence

**2.5 L is the requirement, and the crew drinks about 2.2 L.** So a `watch` row at
2500 mL would fire on an ordinary day, for most of the crew, which is exactly what Bio 2
said.

It is not that 2500 is wrong. It is that it is an **allocation**, and an alert set at the
allocation will fire on normal behaviour.

## Two defensible rows

| Value | What it means | Cost |
| --- | --- | --- |
| **2000 mL** | Slightly below the observed ISS mean, so it fires when someone is clearly under-drinking | Still close to normal |
| **1500 mL** | A floor well below any normal day | Far from the requirement; misses moderate under-drinking |

Either works if the content text states the requirement: *"NASA's requirement is 2.5 L a
day; the app warns you below 2 L"*. What should not happen is the app showing 2.5 L as
the warning line without saying that the crew normally drinks less.

## What is already true in the repo

`config/data/indicators.csv` and the content file already describe the metered galley
dispenser and the manual log. The only open item is the number in `attention.csv`, which
belongs to Bio 2.
