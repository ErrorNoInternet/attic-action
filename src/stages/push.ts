import * as core from "@actions/core";
import { exec } from "@actions/exec";

import splitArray from "just-split";
import { saveStorePaths, getStorePaths } from "../utils";

export const push = async () => {
	core.startGroup("Push to Attic");

	try {
		const skipPush = core.getInput("skip-push");

		if (skipPush === "true") {
			core.info("Pushing to cache is disabled by skip-push");
		} else {
			const cache = core.getInput("cache");

			core.info("Pushing to cache");

			const oldPaths = await getStorePaths();
			await saveStorePaths();
			const newPaths = await getStorePaths();
			const addedPaths = newPaths
				.filter((p) => !oldPaths.includes(p))
				.filter(
					(p) => !p.endsWith(".drv") && !p.endsWith(".drv.chroot") && !p.endsWith(".check") && !p.endsWith(".lock"),
				);

			const splitAddedPaths = splitArray(addedPaths, 25);
			for (const addedPaths of splitAddedPaths) {
				await execWithRetry("attic", ["push", cache, ...addedPaths]);
			}
		}
	} catch (e) {
		core.warning(`Action encountered error: ${e}`);
		core.info("Not considering errors during push a failure.");
	}

	core.endGroup();
};

const execWithRetry = async (command: string, args: string[], retries: number = 1000) => {
    try {
        await exec(command, args);
    } catch (error) {
        core.error(`Execution of ${command} failed with error: ${error}`);
        if (retries > 0) {
            core.info(`Retrying execution of ${command} (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            await execWithRetry(command, args, retries - 1);
        } else {
            throw new Error(`Failed to execute ${command} after multiple retries`);
        }
    }
};
