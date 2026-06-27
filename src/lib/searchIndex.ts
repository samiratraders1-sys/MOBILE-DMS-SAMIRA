import FlexSearch from "flexsearch";

export const createSearchIndex = () => {
    return new FlexSearch.Document({
        document: {
            id: "id",
            index: ["title", "subtitle"],
        },
        tokenize: "forward",
    });
};
