const openai = require("openai");
const {
  OPEN_API_KEY,
  SERP_API_KEY,
  GPT_MODAL,
} = require("../constants/env.contant");
const { getJson } = require("serpapi");
const { extractShoppingResults } = require("../utils/utils.ai");
const Prompt = require("../models/prompt.modal");
const DEFAULT_PROMTS = require("../json/prompts.json")
// OpenAI API key
const apiKey = OPEN_API_KEY;
// Initialize the OpenAI client
const client = new openai.OpenAI({ apiKey });


async function checkPromptAvailability(promptType) {
  try {
    const prompt = await Prompt.findOne({_id : 'prompt_6ThuKMByJWRPHWMfd'}).lean();;

    if (prompt && prompt.hasOwnProperty(promptType)) {
      return { havePrompt: true, prompt: prompt[promptType] };
    }
    
    return { havePrompt: false };
  } catch (error) {
    return { havePrompt: false };
  }
}

// Function to generate product recommendations
async function generateRecommendations(userInput) {
  try {
    let PROMPT =  DEFAULT_PROMTS["reply_to_user_prompt"]
     const checkDBPrompt = await checkPromptAvailability("reply_to_user_prompt")
     if(checkDBPrompt?.havePrompt){
        // console.log("Updated Prompt",checkDBPrompt?.prompt)
        PROMPT = checkDBPrompt?.prompt
     }

     const FINAL_PROMPT = `
      User Query : Here is the user query for your reference : ${userInput},
      Prompt : ${PROMPT},
      Response Format :  Answer in JSON format in below structure: 
      {
        ai_reply : "respond to  User Query by taking reference of Prompt and never use  double inverted commas",
        google_searchable: Is it a generic user inquiry or the real product name?Use "yes" in this case if it is the product name.Use "no" in this case if the question is general.,
        suggestions : "array of strings which consist of your cross-questions, your recommendations,your concerns etc. on the basis of  User Query and make sure these are not covered in your ai_reply section"
      }
     `

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: FINAL_PROMPT },
        { role: "user", content: userInput },
      ],
      model: GPT_MODAL,
      response_format:  {type:'json_object'},
    });

    console.log("recommendations results ::",JSON.stringify(completion))
    return completion;
  } catch (error) {
    console.error("Error while  generating recommendations:", error);
    return {};
  }
}

// Write a prompt to find the products related to skincare and fashion from the given prompts: "${prompt}". Target only keywords associated with skincare and fashion.
async function retrieveProducts(prompt){
  try {
    const PROMPT = `
    As an expert in sourcing specialized product information for specific industries, your role is to scour through a series of prompts and filter out only the products that are related to skincare, budget of product and fashion. Here is the prompt you should use to find the products related to skincare and fashion: ${prompt}. Your goal is to identify and extract items mentioned in the prompts that fall under the category of skincare and fashion. Make sure to focus solely on keywords, phrases, or descriptions that pertain to products in these industries. For instance, if the prompt mentions "face cream," "shirts," "serum," or "heels" these are the types of products you should be looking to identify and list from the provided text. Your task is to be precise, efficient, and accurate in extracting only the relevant skincare and fashion products from the given prompts.

    Please provide the merged query in JSON format. Your response should be structured as follows:
    {
        product_list: "your response"
    }
    `;

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: "your response" },
      ],
      model: GPT_MODAL,
      response_format: { type: "json_object" },
    });

    return completion;
    
  } catch (error) {
     console.error("error while retrieving products",error);
     return prompt  
  }
}

async function getGoogleSearchResults(query) {
  try {
    let updatedQuery = query
    const result = await retrieveProducts(query);
    const content = result.choices?.[0]?.message?.content;

    if(content){
     const parsedContent = JSON.parse(content);
     productList  = parsedContent?.product_list
        if(productList && productList !=''){
          updatedQuery = productList
        }
    }

    // console.log("query",query)
    const response = await getJson({
      api_key: SERP_API_KEY,
      engine: "google_shopping",
      google_domain: "google.com",
      q: updatedQuery,
    });

    if (
      response &&
      (response.shopping_results || response.related_shopping_results)
    ) {
      const finalExtractedResults = extractShoppingResults(response);
      return finalExtractedResults;
    }

    return {};
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
}

async function combineUserQueriesToSingle(queries) {
  try {
    const PROMPT = `
    Your speciality lies in merging and rephrasing user queries to form cohesive and grammatically correct sentences while ensuring the context is maintained.
    Your task is to merge a set of user queries into a single coherent query while ensuring grammatical correctness. Here are the array of user queries you need to merge: ${JSON.stringify(
      queries
    )}.
    Please provide the merged query in JSON format. Your response should be structured as follows:
    {
        user_query: "your merged query"
    }
    `;

    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: "your response" },
      ],
      model: GPT_MODAL,
      response_format: { type: "json_object" },
    });

    return completion;
  } catch (error) {
    console.log("Error while combining user queries to single query", error);
    return [];
  }
}

async function researchOnTopic(prompt) {
  try {
    let PROMPT =  DEFAULT_PROMTS["search_on_topic_prompt"]
    const checkDBPrompt = await checkPromptAvailability("search_on_topic_prompt")
    if(checkDBPrompt?.havePrompt){
       console.log("Updated Prompt",checkDBPrompt?.prompt)
       PROMPT = checkDBPrompt?.prompt
    }


    const FINAL_PROMPT = `
    User Query : Here is the user query for your reference : ${prompt},
    Prompt : ${PROMPT},
    Response Format : Answer in JSON format in below structure: 
    {
      ai_reply : "your response and never use  double inverted commas",
    }
   `

    
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: FINAL_PROMPT },
        { role: "user", content: `Your response` },
      ],
      model: GPT_MODAL,
      response_format: {type:'json_object'}
    });
    return completion;
  } catch (error) {
    console.log("Error while researching on a topic", error);
    return [];
  }
}


async function extractUserPersonalizationData(prompt) {
  try {
    let PROMPT = DEFAULT_PROMTS["user_personalization_prompt"]

    const checkDBPrompt = await checkPromptAvailability("user_personalization_prompt")
    console.log("checkDBPromptcheckDBPromptcheckDBPromptcheckDBPromptcheckDBPromptcheckDBPrompt",checkDBPrompt)
    if(checkDBPrompt?.havePrompt && checkDBPrompt?.havePrompt != false){
       console.log("Updated Prompt",checkDBPrompt?.prompt)
       PROMPT = checkDBPrompt?.prompt
    }


    const FINAL_PROMPT = `
    User Query : Here is the user query for your reference : ${prompt},
    Prompt : ${PROMPT},
    Response Format : If the query reveals personal information, return the insights and the relevant data points in JSON format. Otherwise, return  "personalized_data":"no" to indicate no personal data was found.
   `
   console.log("finalized Promptttttt",FINAL_PROMPT)
    
    const completion = await client.chat.completions.create({
      messages: [
        { role: "system", content: FINAL_PROMPT },
        { role: "user", content: "your response" },
      ],
      model: GPT_MODAL,
      response_format: {type:'json_object'},
    });
    return completion;
  } catch (error) {
    console.log("Error while researching on a topic", error);
    return [];
  }
}







module.exports = {
  generateRecommendations,
  getGoogleSearchResults,
  combineUserQueriesToSingle,
  researchOnTopic,
  extractUserPersonalizationData,
  retrieveProducts
};
