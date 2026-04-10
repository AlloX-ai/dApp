import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	messages: [
		{
			id: "welcome",
			type: "ai",
			content: "Hi, I'm your Allox Web3 AI assistant. I can answer questions about crypto, blockchain, DeFi, tokens, NFTs, and Web3 concepts.",
			timestamp: new Date().toISOString(),
		},
	],
	inputValue: "",
	isThinking: false,
	error: null,
};

const chatbotSlice = createSlice({
	name: "chatbot",
	initialState,
	reducers: {
		setChatbotInputValue: (state, action) => {
			state.inputValue = action.payload;
		},
		addChatbotMessage: (state, action) => {
			state.messages.push(action.payload);
		},
		appendToChatbotMessage: (state, action) => {
			const { id, text } = action.payload;
			const target = state.messages.find((msg) => msg.id === id);
			if (target) {
				target.content += text;
			}
		},
		setChatbotThinking: (state, action) => {
			state.isThinking = action.payload;
		},
		setChatbotError: (state, action) => {
			state.error = action.payload;
		},
		resetChatbot: (state) => {
			state.messages = [...initialState.messages];
			state.inputValue = "";
			state.isThinking = false;
			state.error = null;
		},
	},
});

export const {
	setChatbotInputValue,
	addChatbotMessage,
	appendToChatbotMessage,
	setChatbotThinking,
	setChatbotError,
	resetChatbot,
} = chatbotSlice.actions;

export default chatbotSlice.reducer;
