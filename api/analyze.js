// /api/analyze.js
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  if (!process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'Missing ENV variable VERTEX_SERVICE_ACCOUNT_JSON' });
  }

  try {
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Haal afbeelding op en verklein als nodig (<1MB)
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    const resizedImage = await sharp(Buffer.from(buffer))
      .resize({ width: 512 }) // evt. kleiner maken
      .jpeg({ quality: 80 }) // comprimeren
      .toBuffer();

    const base64 = resizedImage.toString('base64');

    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const vertexRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
    body: JSON.stringify({
      instances: [
        {
          image: { b64: base64 }
        }
      ]
    }),

    if (!vertexRes.ok) {
      const errorText = await vertexRes.text();
      console.error('❌ Vertex AI error:', errorText);
      return res.status(vertexRes.status).json({ error: 'Vertex AI error', details: errorText });
    }

    const prediction = await vertexRes.json();

    // === HIER CLASSIFICATIE BEREKENING ===
    const scores = prediction.predictions?.[0]?.scores;
const labels = [
  "English pointer", "English setter", "Kerry blue terrier", "Cairn terrier", "English cocker spaniel", "Gordon setter", "Airedale terrier", "Australian terrier", "Bedlington terrier", "Border terrier",
  "Bull terrier", "Fox terrier (smooth)", "English toy terrier (black &tan)", "Swedish vallhund", "Belgian shepherd dog", "Old english sheepdog", "Griffon nivernais", "Briquet griffon vendeen", "Ariegeois", "Gascon saintongeois",
  "Great gascony blue", "Poitevin", "Billy", "Artois hound", "Porcelaine", "Small blue gascony", "Blue gascony griffon", "Grand basset griffon vendeen", "Norman artesien basset", "Blue gascony basset",
  "Basset fauve de bretagne", "Portuguese water dog", "Welsh corgi (cardigan)", "Welsh corgi (pembroke)", "Irish soft coated wheaten terrier", "Yugoslavian shepherd dog - sharplanina", "Jämthund", "Basenji", "Berger de beauce", "Bernese mountain dog",
  "Appenzell cattle dog", "Entlebuch cattle dog", "Karelian bear dog", "Finnish spitz", "Newfoundland", "Finnish hound", "Polish hound", "Komondor", "Kuvasz", "Puli",
  "Pumi", "Hungarian short-haired pointer (vizsla)", "Great swiss mountain dog", "Swiss hound", "Small swiss hound", "St. bernard", "Coarse-haired styrian hound", "Austrian black and tan hound", "Austrian pinscher", "Maltese",
  "Fawn brittany griffon", "Petit basset griffon vendeen", "Tyrolean hound", "Lakeland terrier", "Manchester terrier", "Norwich terrier", "Scottish terrier", "Sealyham terrier", "Skye terrier", "Staffordshire bull terrier",
  "Continental toy spaniel", "Welsh terrier", "Griffon bruxellois", "Griffon belge", "Petit brabançon", "Schipperke", "Bloodhound", "West highland white terrier", "Yorkshire terrier", "Catalan sheepdog",
  "Shetland sheepdog", "Ibizan podenco", "Burgos pointing dog", "Spanish mastiff", "Pyrenean mastiff", "Portuguese sheepdog", "Portuguese warren hound-portuguese podengo", "Brittany spaniel", "Rafeiro of alentejo", "German spitz",
  "German wire- haired pointing dog", "Weimaraner", "Westphalian dachsbracke", "French bulldog", "Kleiner münsterländer", "German hunting terrier", "German spaniel", "French water dog", "Blue picardy spaniel", "Wire-haired pointing griffon korthals",
  "Picardy spaniel", "Clumber spaniel", "Curly coated retriever", "Golden retriever", "Briard", "Pont-audemer spaniel", "Saint germain pointer", "Dogue de bordeaux", "Deutsch langhaar", "Large munsterlander",
  "German short- haired pointing dog", "Irish red setter", "Flat coated retriever", "Labrador retriever", "Field spaniel", "Irish water spaniel", "English springer spaniel", "Welsh springer spaniel", "Sussex spaniel", "King charles spaniel",
  "Smålandsstövare", "Drever", "Schillerstövare", "Hamiltonstövare", "French pointing dog - gascogne type", "French pointing dog - pyrenean type", "Swedish lapphund", "Cavalier king charles spaniel", "Pyrenean mountain dog", "Pyrenean sheepdog - smooth faced",
  "Irish terrier", "Boston terrier", "Long-haired pyrenean sheepdog", "Slovakian chuvach", "Dobermann", "Boxer", "Leonberger", "Rhodesian ridgeback", "Rottweiler", "Dachshund",
  "Bulldog", "Serbian hound", "Istrian short-haired hound", "Istrian wire-haired hound", "Dalmatian", "Posavatz hound", "Bosnian broken-haired hound - called barak", "Collie rough", "Bullmastiff", "Greyhound",
  "English foxhound", "Irish wolfhound", "Beagle", "Whippet", "Basset hound", "Deerhound", "Italian spinone", "German shepherd dog", "American cocker spaniel", "Dandie dinmont terrier",
  "Fox terrier (wire)", "Castro laboreiro dog", "Bouvier des ardennes", "Poodle", "Estrela mountain dog", "French spaniel", "Picardy sheepdog", "Ariege pointing dog", "Bourbonnais pointing dog", "Auvergne pointer",
  "Giant schnauzer", "Schnauzer", "Miniature schnauzer", "German pinscher", "Miniature pinscher", "Affenpinscher", "Portuguese pointing dog", "Sloughi", "Finnish lapponian dog", "Hovawart",
  "Bouvier des flandres", "Kromfohrländer", "Borzoi - russian hunting sighthound", "Bergamasco shepherd dog", "Italian volpino", "Bolognese", "Neapolitan mastiff", "Italian rough-haired segugio", "Cirneco dell'etna", "Italian sighthound",
  "Maremma and the abruzzes sheepdog", "Italian pointing dog", "Norwegian hound", "Spanish hound", "Chow chow", "Japanese chin", "Pekingese", "Shih tzu", "Tibetan terrier", "Canadian eskimo dog",
  "Samoyed", "Hanoverian scent hound", "Hellenic hound", "Bichon frise", "Pudelpointer", "Bavarian mountain scent hound", "Chihuahua", "French tricolour hound", "French white & black hound", "Frisian water dog",
  "Stabijhoun", "Dutch shepherd dog", "Drentsche partridge dog", "Fila brasileiro", "Landseer (european continental type)", "Lhasa apso", "Afghan hound", "Serbian tricolour hound", "Tibetan mastiff", "Tibetan spaniel",
  "Deutsch stichelhaar", "Little lion dog", "Xoloitzcuintle", "Great dane", "Australian silky terrier", "Norwegian buhund", "Mudi", "Hungarian wire-haired pointer", "Hungarian greyhound", "Hungarian hound - transylvanian scent hound",
  "Norwegian elkhound grey", "Alaskan malamute", "Slovakian hound", "Bohemian wire-haired pointing griffon", "Cesky terrier", "Atlas mountain dog (aidi)", "Pharaoh hound", "Majorca mastiff", "Havanese", "Polish lowland sheepdog",
  "Tatra shepherd dog", "Pug", "Alpine dachsbracke", "Akita", "Shiba", "Japanese terrier", "Tosa", "Hokkaido", "Japanese spitz", "Chesapeake bay retriever",
  "Mastiff", "Norwegian lundehund", "Hygen hound", "Halden hound", "Norwegian elkhound black", "Saluki", "Siberian husky", "Bearded collie", "Norfolk terrier", "Canaan dog",
  "Greenland dog", "Brazilian tracker", "Norrbottenspitz", "Croatian shepherd dog", "Karst shepherd dog", "Montenegrin mountain hound", "Old danish pointing dog", "Grand griffon vendeen", "Coton de tulear", "Lapponian herder",
  "Spanish greyhound", "American staffordshire terrier", "Australian cattle dog", "Chinese crested dog", "Icelandic sheepdog", "Beagle harrier", "Eurasian", "Dogo argentino", "Australian kelpie", "Otterhound",
  "Harrier", "Collie smooth", "Border collie", "Romagna water dog", "German hound", "Black and tan coonhound", "American water spaniel", "Irish glen of imaal terrier", "American foxhound", "Russian-european laika",
  "East siberian laika", "West siberian laika", "Azawakh", "Dutch smoushond", "Shar pei", "Peruvian hairless dog", "Saarloos wolfhond", "Nova scotia duck tolling retriever", "Dutch schapendoes", "Nederlandse kooikerhondje",
  "Broholmer", "French white and orange hound", "Kai", "Kishu", "Shikoku", "Wirehaired slovakian pointer", "Majorca shepherd dog", "Great anglo-french tricolour hound", "Great anglo-french white and black hound", "Great anglo-french white & orange hound",
  "Medium-sized anglo-french hound", "South russian shepherd dog", "Russian black terrier", "Caucasian shepherd dog", "Canarian warren hound", "Irish red and white setter", "Kangal shepherd dog", "Czechoslovakian wolfdog", "Polish greyhound", "Korea jindo dog",
  "Central asia shepherd dog", "Spanish water dog", "Italian short-haired segugio", "Thai ridgeback dog", "Parson russell terrier", "Saint miguel cattle dog", "Brazilian terrier", "Australian shepherd", "Italian cane corso", "American akita",
  "Jack russell terrier", "Presa canario", "White swiss shepherd dog", "Taiwan dog", "Romanian mioritic shepherd dog", "Romanian carpathian shepherd dog", "Australian stumpy tail cattle dog", "Russian toy", "Cimarrón uruguayo", "Polish hunting dog",
  "Bosnian and herzegovinian - croatian shepherd dog", "Danish-swedish farmdog", "Romanian bucovina shepherd", "Thai bangkaew dog", "Miniature bull terrier", "Lancashire heeler", "Segugio maremmano", "Kintamani-bali dog", "Prague ratter", "Bohemian shepherd dog",
  "Yakutian laika", "Estonian hound", "Miniature american shepherd", "Transmontano mastiff", "Continental bulldog", "Valencian terrier"
];

    if (!scores || scores.length === 0) {
      return res.status(500).json({ error: 'No prediction scores received' });
    }

    const maxIndex = scores.indexOf(Math.max(...scores));
    const label = labels[maxIndex] || 'Onbekend';

    return res.status(200).json({
      status: 'success',
      label,
      confidence: scores[maxIndex],
      scores
    });
  } catch (err) {
    console.error('❌ Server Error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
