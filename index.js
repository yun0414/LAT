'use strict';

const line = require('@line/bot-sdk'),
      express = require('express'), 
      configGet = require('config');
const {TextAnalyticsClient, AzureKeyCredential} = require("@azure/ai-text-analytics");

//Line config
const configLine = {
    channelAccessToken:configGet.get('CHANNEL_ACCESS_TOKEN'),
    channelSecret:configGet.get("CHANNEL_SECRET")
};

const client = new line.Client(configLine);


//Azure Text Sentiment
const endpoint = configGet.get("ENDPOINT");
const apiKey = configGet.get("TEXT_ANALYTICS_API_KEY");

const app = express();

const port = process.env.PORT || process.env.port || 3001;

app.listen(port, ()=>{
    console.log(`listening on ${port}`);
});

async function MS_TextSentimentAnalysis(thisEvent){
    console.log("[MS_TextSentimentAnalysis] in");

    const analyticsClient = new TextAnalyticsClient(endpoint, new AzureKeyCredential(apiKey));

    let documents = [];
    documents.push(thisEvent.message.text);
    //documents.push("我覺得櫃台人員很親切");

    const results = await analyticsClient.analyzeSentiment(documents, "zh-hant",{
        includeOpinionMining:true
    });
    console.log("[result] ", JSON.stringify(results));

    let result_string = []
    const result_score = results[0].confidenceScores[results[0].sentiment]
    const result_n = results[0].sentences[0].opinions[0].target.text

    if(results[0].sentiment == "positive"){
        result_string = "正向"
    }
    else if(results[0].sentiment == "negative"){
        result_string = "負向"
    }
    else{
        result_string = "中立"
    }


    const echo = {
        type: 'text',
        text: `主詞:${result_n}\n情緒:${result_string}\n分數:${result_score.toFixed(2)}`
    };

    return client.replyMessage(thisEvent.replyToken, echo)
    
}

app.post('/callback',line.middleware(configLine),(req,res)=>{
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result)=>res.json(result))
        .catch((err)=>{
            console.error(err);
            res.status(500).end();
        });
});

function handleEvent(event){
    if(event.type !=='message' || event.message.type!=='text'){ /*only deal with text*/
        return Promise.resolve(null);
    }

    MS_TextSentimentAnalysis(event)
        .catch((err)=>{
            console.error("Error:",err);
        });
    
}