package monetization

import "fmt"

type StarterPack struct {
	Name              string
	Contents          []string
	IndividualValue   string
	BundlePrice       string
	Discount          string
	OneTimePurchase   bool
	ExpectedConversion string
}

func GetStarterPack() StarterPack {
	return StarterPack{
		Name: "Starter Pack",
		Contents: []string{"500 coins", "1 skin", "3x power-ups"},
		IndividualValue: "$9.97",
		BundlePrice: "$4.99",
		Discount: "50%",
		OneTimePurchase: true,
		ExpectedConversion: "5-8%",
	}
}

func DisplayStarterPackDetails(pack StarterPack) {
	fmt.Printf("Name: %s\nContents: %v\nIndividual Value: %s\nBundle Price: %s\nDiscount: %s\nOne-Time Purchase: %t\nExpected Conversion: %s\n",
		pack.Name, pack.Contents, pack.IndividualValue, pack.BundlePrice, pack.Discount, pack.OneTimePurchase, pack.ExpectedConversion)
}
