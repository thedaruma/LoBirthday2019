import { WarpController } from "../data/controllers/WarpController";

export class WarpUtility {
    private warpController: WarpController;
    /**
     * A utility for handling warping between maps/scenes.
     */
    constructor(private scene: Phaser.Scene) {
        this.warpController = new WarpController(this.scene.game);
    }

    public getWarp(warpId: number) {
        return this.warpController.getWarpById(warpId);
    }

    public warpTo(warpDestinationId: number) {
        const { warpId, warpDestId, destinationLocation } = this.warpController.getWarpByDestId(warpDestinationId);
        const { scene, map, tileset, enemyPartyIds } = destinationLocation;
        this.scene.scene.start(scene, {
            map,
            tileset,
            warpId,
            warpDestId,
            enemyPartyIds
        })
    }
}